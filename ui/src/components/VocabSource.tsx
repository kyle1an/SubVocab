import type { InitialTableState } from '@tanstack/react-table'

import usePagination from '@mui/material/usePagination'
import { useUnmountEffect } from '@react-hookz/web'
import {
  createColumnHelper,
  getCoreRowModel,
  getExpandedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import {
  useTranslation,
} from 'react-i18next'
import { useSessionStorage } from 'react-use'

import type { LearningPhase } from '@/lib/LabeledTire'
import type { LabelDisplaySource } from '@/lib/vocab'

import { SearchWidget } from '@/components/search-widget'
import { TablePagination } from '@/components/table-pagination'
import { TablePaginationSizeSelect } from '@/components/table-pagination-size-select'
import { TableHeaderCell, TableHeaderCellRender, TableRow } from '@/components/ui/table-element'
import { AcquaintAllDialog } from '@/components/vocabulary/acquaint-all-dialog'
import { useVocabularyCommonColumns } from '@/components/vocabulary/columns'
import { ExampleSentence } from '@/components/vocabulary/example-sentence'
import { VocabularyMenu } from '@/components/vocabulary/menu'
import { useLastTruthy } from '@/lib/hooks'
import { SortIcon } from '@/lib/icon-utils'
import { LEARNING_PHASE } from '@/lib/LabeledTire'
import { tryGetRegex } from '@/lib/regex'
import { findClosest } from '@/lib/utilities'
import { isSourceTextStaleAtom } from '@/store/useVocab'

type TableData = LabelDisplaySource

type ColumnFilterFn = (rowValue: TableData) => boolean

const PAGE_SIZES = [10, 20, 40, 50, 100, 200, 500, 1000] as const

const isUsingRegexAtom = atom(false)
const searchValueAtom = atom('')
const initialTableStateAtom = atom<InitialTableState>({
  columnOrder: ['frequency', 'word', 'word.length', 'acquaintedStatus', 'rank'],
  pagination: {
    pageSize: findClosest(100, PAGE_SIZES),
    pageIndex: 0,
  },
})

function useSegments() {
  const { t } = useTranslation()
  return [
    { value: 'all', label: t('all') },
    { value: 'new', label: t('new') },
    { value: 'acquainted', label: t('acquainted') },
  ] as const
}

type Segment = ReturnType<typeof useSegments>[number]['value']
const SEGMENT_NAME = 'source-table-segment'

const noFilter = () => true

function useAcquaintedStatusFilter(filterSegment: Segment): ColumnFilterFn {
  let filteredValue: LearningPhase[] = []
  if (filterSegment === 'new')
    filteredValue = [LEARNING_PHASE.NEW, LEARNING_PHASE.RETAINING]
  else if (filterSegment === 'acquainted')
    filteredValue = [LEARNING_PHASE.ACQUAINTED, LEARNING_PHASE.FADING]
  else
    return noFilter

  return (row) => filteredValue.includes(row.inertialPhase)
}

function useSearchFilterValue(search: string, usingRegex: boolean): ColumnFilterFn | undefined {
  search = search.toLowerCase()
  if (usingRegex) {
    const newRegex = tryGetRegex(search)
    if (newRegex)
      return (row) => newRegex.test(row.vocab.word)
  }
  else {
    return (row) => row.wFamily.some((word) => word.toLowerCase().includes(search))
  }
}

function useSourceColumns<T extends TableData>() {
  const { t } = useTranslation()
  const columnHelper = createColumnHelper<T>()
  return (
    [
      columnHelper.accessor((row) => row.locations.length, {
        id: 'frequency',
        header: ({ header }) => {
          const isSorted = header.column.getIsSorted()
          const title = t('frequency')
          return (
            <TableHeaderCell
              header={header}
              className="w-[.1%] active:bg-background-active"
            >
              <Div
                className="min-w-[4.5rem] grow select-none gap-0.5 pl-2 pr-1"
                onClick={header.column.getToggleSortingHandler()}
              >
                <div className="flex grow items-center">
                  <span
                    title={title}
                    className={cn('grow text-right stretch-[condensed] before:invisible before:block before:h-0 before:overflow-hidden before:font-bold before:content-[attr(title)]', isSorted ? 'font-semibold' : '')}
                  >
                    {title}
                  </span>
                  <SortIcon isSorted={isSorted} />
                </div>
              </Div>
            </TableHeaderCell>
          )
        },
        cell: ({ row, cell, getValue, onExpandedChange }) => {
          const value = getValue()
          const isExpanded = row.getIsExpanded()
          return (
            <TableDataCell
              cell={cell}
            >
              <Div className="text-zinc-400">
                {row.getCanExpand() ? (
                  <button
                    type="button"
                    className="flex h-full grow items-center justify-between gap-1 px-3"
                    onClick={() => {
                      onExpandedChange?.(isExpanded)
                    }}
                  >
                    <IconLucideChevronRight
                      className={cn(
                        'size-[14px] text-zinc-400 transition-transform duration-200 dark:text-zinc-500',
                        isExpanded ? 'rotate-90' : '',
                      )}
                    />
                    <span className="float-right inline-block tabular-nums stretch-[condensed]">
                      {value}
                    </span>
                  </button>
                ) : (
                  <div className="w-full justify-end px-3">
                    <span className="float-right inline-block tabular-nums stretch-[condensed]">
                      {value}
                    </span>
                  </div>
                )}
              </Div>
            </TableDataCell>
          )
        },
      }),
    ]
  )
}

export function VocabSourceTable({
  data,
  sentences,
  onPurge,
  className = '',
}: {
  data: TableData[]
  sentences: string[]
  onPurge: () => void
  className?: string
}) {
  // eslint-disable-next-line react-compiler/react-compiler
  'use no memo'
  const { t } = useTranslation()
  const [searchValue, setSearchValue] = useAtom(searchValueAtom)
  const deferredSearchValue = useDeferredValue(searchValue)
  const [isUsingRegex, setIsUsingRegex] = useAtom(isUsingRegexAtom)
  const deferredIsUsingRegex = useDeferredValue(isUsingRegex)
  const [initialTableState, setInitialTableState] = useAtom(initialTableStateAtom)
  const vocabularyCommonColumns = useVocabularyCommonColumns<TableData>()
  const sourceColumns = useSourceColumns()
  const columns = [...vocabularyCommonColumns, ...sourceColumns]
  const segments = useSegments()
  const [segment, setSegment] = useSessionStorage<Segment>(`${SEGMENT_NAME}-value`, 'all')
  const segmentDeferredValue = useDeferredValue(segment)
  const lastTruthySearchFilterValue = useLastTruthy(useSearchFilterValue(deferredSearchValue, deferredIsUsingRegex))
  const isSourceTextStale = useAtomValue(isSourceTextStaleAtom)
  const [disableNumberAnim, setDisableNumberAnim] = useState(false)

  const table = useReactTable({
    data,
    columns,
    state: {
      columnFilters: [
        {
          id: 'acquaintedStatus',
          value: useAcquaintedStatusFilter(segmentDeferredValue),
        },
        {
          id: 'word',
          value: lastTruthySearchFilterValue ?? noFilter,
        },
      ],
    },
    initialState: initialTableState,
    autoResetPageIndex: false,
    getRowId: (row) => row.vocab.word,
    getRowCanExpand: (row) => sentences.length > 0 && row.original.locations.length > 0,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getSortedRowModel: getSortedRowModel(),
    debugTable: true,
  })

  function handleSegmentChoose(newSegment: typeof segment) {
    setSegment(newSegment)
    requestAnimationFrame(() => {
      startTransition(() => {
        setDisableNumberAnim(true)
        requestAnimationFrame(() => {
          setDisableNumberAnim(false)
          onPurge()
        })
      })
    })
  }

  const tableState = table.getState()
  const { items } = usePagination({
    count: table.getPageCount(),
    page: tableState.pagination.pageIndex + 1,
  })

  const rowsFiltered = table.getFilteredRowModel().rows
  const {
    rowsAcquainted = [],
    rowsNew = [],
  } = Object.groupBy(rowsFiltered, (row) => {
    switch (row.original.vocab.learningPhase) {
      case LEARNING_PHASE.ACQUAINTED:
        return 'rowsAcquainted'
      case LEARNING_PHASE.NEW:
        return 'rowsNew'
      default:
        return '_'
    }
  })
  const rowsToRetain = rowsNew
    .map((row) => row.original.vocab)

  useUnmountEffect(() => {
    setInitialTableState(tableState)
  })
  const rootRef = useRef<HTMLDivElement>(null)
  const isStale = isSourceTextStale || segment !== segmentDeferredValue || searchValue !== deferredSearchValue || isUsingRegex !== deferredIsUsingRegex

  return (
    <div className={cn('flex h-full flex-col items-center overflow-hidden bg-background will-change-transform', className)}>
      <div className="z-10 flex h-12 w-full justify-between bg-background p-2">
        <VocabularyMenu>
          <DropdownMenuLabel>{t('Options')}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem
              onSelect={(e) => e.preventDefault()}
              className="p-0"
            >
              <AcquaintAllDialog
                vocabulary={rowsToRetain}
              />
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </VocabularyMenu>
        <div className="flex items-center px-2.5 text-base">
          <div
            className={clsx(
              'flex justify-center transition-all delay-300 duration-200',
              isStale ? '' : 'opacity-0',
            )}
          >
            <Spinner
              variant="primary"
              size="sm"
            />
          </div>
        </div>
        <div className="grow"></div>
        <SearchWidget
          value={searchValue}
          isUsingRegex={isUsingRegex}
          onSearch={setSearchValue}
          onRegex={setIsUsingRegex}
        />
      </div>
      <div className="h-px w-full border-b border-solid border-zinc-200 shadow-[0_0.4px_2px_0_rgb(0_0_0/0.05)] dark:border-slate-800" />
      <div className="w-full">
        <SegmentedControl
          value={segment}
          segments={segments}
          onChoose={handleSegmentChoose}
          variant="ghost"
        />
      </div>
      <div
        ref={rootRef}
        className="w-full grow overflow-auto overflow-y-scroll overscroll-contain"
      >
        <table className="relative min-w-full border-separate border-spacing-0">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHeaderCellRender
                    key={header.id}
                    header={header}
                  />
                ))}
              </tr>
            ))}
          </TableHeader>
          <tbody>
            {table.getRowModel().rows.map((row, index) => {
              return (
                <TableRow
                  key={row.id}
                  row={row}
                  rootRef={rootRef}
                  index={index + 1}
                >
                  <ExampleSentence
                    sentences={sentences}
                    src={row.original.locations}
                    className="text-xs tracking-wide"
                  />
                </TableRow>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="flex w-full flex-wrap items-center justify-between gap-0.5 border-t border-t-zinc-200 py-1 pr-0.5 tabular-nums dark:border-slate-800">
        <TablePagination
          items={items}
          table={table}
        />
        <div className="flex grow items-center justify-end">
          <div className="flex items-center">
            <TablePaginationSizeSelect
              table={table}
              sizes={PAGE_SIZES}
              value={tableState.pagination.pageSize}
            />
            <div className="whitespace-nowrap px-1 text-[.8125rem]">{`/${t('page')}`}</div>
          </div>
        </div>
      </div>
      <div className="flex w-full justify-center border-t border-solid border-t-zinc-200 bg-background dark:border-slate-800">
        <VocabStatics
          rowsCountFiltered={rowsFiltered.length}
          text={` ${t('vocabulary')}`}
          rowsCountNew={rowsNew.length}
          rowsCountAcquainted={rowsAcquainted.length}
          animated={!disableNumberAnim}
          progress
        />
      </div>
    </div>
  )
}
