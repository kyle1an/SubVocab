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
import { useSessionStorage } from 'react-use'

import type { LearningPhase } from '@/lib/LabeledTire'
import type { LabelDisplayTable } from '@/lib/vocab'

import { statusLabels, userVocabularyAtom } from '@/api/vocab-api'
import { SearchWidget } from '@/components/search-widget'
import { TablePagination } from '@/components/table-pagination'
import { TablePaginationSizeSelect } from '@/components/table-pagination-size-select'
import { TableHeaderCell, TableHeaderCellRender, TableRow } from '@/components/ui/table-element'
import { AcquaintAllDialog } from '@/components/vocabulary/acquaint-all-dialog'
import { useVocabularyCommonColumns } from '@/components/vocabulary/columns'
import { VocabularyMenu } from '@/components/vocabulary/menu'
import { useLastTruthy } from '@/lib/hooks'
import { SortIcon } from '@/lib/icon-utils'
import { LEARNING_PHASE } from '@/lib/LabeledTire'
import { tryGetRegex } from '@/lib/regex'
import { findClosest, getFallBack } from '@/lib/utilities'
import { vocabRealtimeSyncStatusAtom } from '@/store/useVocab'

type TableData = LabelDisplayTable

type ColumnFilterFn = (rowValue: TableData) => boolean

const PAGE_SIZES = [10, 20, 40, 50, 100, 200, 500, 1000] as const

const isUsingRegexAtom = atom(false)
const searchValueAtom = atom('')
const initialTableStateAtom = atom<InitialTableState>({
  columnOrder: ['timeModified', 'word', 'word.length', 'acquaintedStatus', 'userOwned', 'rank'],
  pagination: {
    pageSize: findClosest(100, PAGE_SIZES),
    pageIndex: 0,
  },
  sorting: [
    {
      id: 'timeModified',
      desc: true,
    },
  ],
  columnVisibility: {
    userOwned: false,
  },
})

function useSegments() {
  const { t } = useTranslation()
  return [
    { value: 'new', label: t('recent') },
    { value: 'allAcquainted', label: t('all') },
    { value: 'mine', label: t('mine') },
    { value: 'top', label: t('top') },
  ] as const
}

type Segment = ReturnType<typeof useSegments>[number]['value']
const SEGMENT_NAME = 'data-table-segment'

const noFilter = () => true

function useAcquaintedStatusFilter(filterSegment: Segment): ColumnFilterFn {
  let filteredValue: LearningPhase[] = []
  if (filterSegment === 'new')
    filteredValue = [LEARNING_PHASE.NEW, LEARNING_PHASE.RETAINING]
  else if (filterSegment === 'allAcquainted' || filterSegment === 'mine' || filterSegment === 'top')
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

function useUserOwnedFilter(filterSegment: Segment): ColumnFilterFn {
  let filteredValue: boolean[] = []
  if (filterSegment === 'top')
    filteredValue = [false]
  else if (filterSegment === 'mine')
    filteredValue = [true]
  else
    return noFilter

  return (row) => filteredValue.includes(row.vocab.isUser)
}

function useDataColumns<T extends TableData>() {
  const { t } = useTranslation()
  const columnHelper = createColumnHelper<T>()
  return (
    [
      columnHelper.accessor((row) => row.vocab.timeModified, {
        id: 'timeModified',
        header: ({ header }) => {
          const isSorted = header.column.getIsSorted()
          const title = t('distance')
          return (
            <TableHeaderCell
              header={header}
              className="w-[12%] active:bg-background-active"
            >
              <Div
                className="select-none pl-2 pr-1"
                onClick={header.column.getToggleSortingHandler()}
              >
                <span
                  title={title}
                  className={cn('grow text-right stretch-[condensed] before:invisible before:block before:h-0 before:overflow-hidden before:font-bold before:content-[attr(title)]', isSorted ? 'font-semibold' : '')}
                >
                  {title}
                </span>
                <SortIcon isSorted={isSorted} />
              </Div>
            </TableHeaderCell>
          )
        },
        cell: ({ cell, getValue }) => {
          const value = getValue()
          return (
            <TableDataCell
              cell={cell}
            >
              <Div className="justify-center tabular-nums stretch-[condensed]">
                {value ? formatDistanceToNowStrict(new Date(value)) : null}
              </Div>
            </TableDataCell>
          )
        },
      }),
      columnHelper.accessor((row) => row.vocab.isUser, {
        id: 'userOwned',
        filterFn: (row, columnId, fn: ColumnFilterFn) => fn(row.original),
      }),
    ]
  )
}

export function VocabDataTable({
  data,
  onPurge,
  className = '',
}: {
  data: TableData[]
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
  const dataColumns = useDataColumns()
  const columns = [...vocabularyCommonColumns, ...dataColumns]
  const segments = useSegments()
  const [segment, setSegment] = useSessionStorage<Segment>(`${SEGMENT_NAME}-value`, 'allAcquainted')
  const segmentDeferredValue = useDeferredValue(segment)
  const [disableNumberAnim, setDisableNumberAnim] = useState(false)
  const lastTruthySearchFilterValue = useLastTruthy(useSearchFilterValue(deferredSearchValue, deferredIsUsingRegex)) ?? noFilter
  const { refetch, isFetching: isLoadingUserVocab } = useAtomValue(userVocabularyAtom)

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
          id: 'userOwned',
          value: useUserOwnedFilter(segmentDeferredValue),
        },
        {
          id: 'word',
          value: lastTruthySearchFilterValue,
        },
      ],
    },
    initialState: initialTableState,
    autoResetPageIndex: false,
    getRowId: (row) => row.vocab.word,
    getRowCanExpand: () => false,
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
  const isStale = segment !== segmentDeferredValue || searchValue !== deferredSearchValue || isUsingRegex !== deferredIsUsingRegex
  const [vocabRealtimeSubscribeState] = useAtom(vocabRealtimeSyncStatusAtom)

  return (
    <div className={cn('flex h-full flex-col items-center overflow-hidden bg-background will-change-transform', className)}>
      <div className="z-10 flex h-12 w-full justify-between bg-background p-2">
        <VocabularyMenu>
          <DropdownMenuLabel>{t('Options')}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem
              disabled={isLoadingUserVocab}
              className="justify-between gap-1.5"
              onClick={(e) => {
                requestAnimationFrame(() => refetch())
              }}
            >
              <div>
                Refresh
              </div>
              <IconMaterialSymbolsRefreshRounded
                className={clsx(
                  isLoadingUserVocab && 'animate-spin',
                )}
              />
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled
              className={clsx(
                'gap-1.5',
              )}
            >
              <div>
                {getFallBack(vocabRealtimeSubscribeState ?? '', statusLabels)}
              </div>
              <div
                className="size-[1em]"
              />
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={(e) => e.preventDefault()}
              className="justify-between p-0"
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
        className="w-full grow overflow-auto overflow-y-scroll overscroll-contain"
      >
        <table className="min-w-full border-separate border-spacing-0">
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
            {table.getRowModel().rows.map((row) => {
              return (
                <TableRow
                  key={row.id}
                  row={row}
                />
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
        />
      </div>
    </div>
  )
}
