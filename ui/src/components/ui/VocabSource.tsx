import {
  Fragment, useCallback, useMemo, useState,
} from 'react'
import {
  type ExpandedState,
  type SortingState,
  type Table,
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { uniq } from 'lodash-es'
import usePagination, { type UsePaginationItem } from '@mui/material/usePagination'
import { Trans, useTranslation } from 'react-i18next'
import { useSessionStorage } from 'react-use'
import { toast } from 'sonner'
import { atom, useAtom } from 'jotai'
import { SearchWidget } from './search-widget'
import { Icon } from '@/components/ui/icon'
import { Examples } from '@/components/ui/Examples.tsx'
import { SegmentedControl } from '@/components/ui/SegmentedControl.tsx'
import { VocabToggle } from '@/components/ui/ToggleButton.tsx'
import { cn } from '@/lib/utils.ts'
import { Separator } from '@/components/ui/separator.tsx'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.tsx'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { LEARNING_PHASE, type LearningPhase, type VocabState } from '@/lib/LabeledTire'
import type { LabelDisplaySource } from '@/lib/vocab'
import { useAcquaintWordsMutation, useRevokeWordMutation } from '@/api/vocab-api'
import { useVocabStore } from '@/store/useVocab'
import type { TI } from '@/i18n'
import { LoginToast } from '@/components/login-toast'
import { sortIcon } from '@/lib/icon-utils'
import type { GroupHeader } from '@/types/vocab'
import { tryGetRegex } from '@/lib/regex'

const columnHelper = createColumnHelper<LabelDisplaySource>()

function TableHeader<T extends Table<any>>({ header }: { header: GroupHeader<T> }) {
  return (
    header.isPlaceholder ? (
      <th
        colSpan={header.colSpan}
        className="border-y border-solid border-y-zinc-200 p-0 text-sm font-normal"
      />
    ) : (
      <>
        {flexRender(
          header.column.columnDef.header,
          header.getContext(),
        )}
      </>
    )
  )
}

type ColumnFilterFn = (rowValue: LabelDisplaySource) => boolean

const useRegexAtom = atom(false)
const searchValueAtom = atom('')

export function VocabSourceTable({
  data,
  sentences,
  onPurge,
  className = '',
}: {
  data: LabelDisplaySource[]
  sentences: string[]
  onPurge: () => void
  className?: string
}) {
  type TProp = LabelDisplaySource
  const { t } = useTranslation()
  const { mutateAsync: mutateRevokeWordAsync } = useRevokeWordMutation()
  const { mutateAsync: mutateAcquaintWordsAsync } = useAcquaintWordsMutation()
  const username = useVocabStore((state) => state.username)
  const [searchValue, setSearchValue] = useAtom(searchValueAtom)
  const [useRegex, setUseRegex] = useAtom(useRegexAtom)

  const handleVocabToggle = useCallback(function handleVocabToggle(vocab: TProp) {
    if (!username) {
      toast(<LoginToast />)
      return
    }

    const rows2Mutate = [vocab].filter((row) => row.word.length <= 32)
    if (rows2Mutate.length === 0) {
      return
    }

    if (vocab.learningPhase === LEARNING_PHASE.ACQUAINTED) {
      mutateRevokeWordAsync(rows2Mutate)
        .catch(console.error)
    } else {
      mutateAcquaintWordsAsync(rows2Mutate)
        .catch(console.error)
    }
  }, [username, mutateAcquaintWordsAsync, mutateRevokeWordAsync])

  const columns = useMemo(() => {
    return [
      columnHelper.accessor((row) => row.locations.length, {
        id: 'frequency',
        header: ({ header }) => {
          const isSorted = header.column.getIsSorted()
          return (
            <th
              colSpan={header.colSpan}
              className={cn(
                'group/th w-[0.1%] whitespace-nowrap border-y border-solid border-y-zinc-200 p-0 text-sm font-normal active:bg-stone-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400',
              )}
            >
              <div
                className="flex h-7 min-w-[4.5rem] grow cursor-pointer select-none items-center gap-0.5 pl-2 pr-1 text-zinc-500 dark:text-zinc-400"
                onClick={header.column.getToggleSortingHandler()}
              >
                <div className="flex grow items-center">
                  <span
                    title={t('frequency')}
                    className={cn('grow text-right text-xs stretch-[condensed] before:invisible before:block before:h-0 before:overflow-hidden before:font-bold before:content-[attr(title)]', isSorted ? 'font-semibold' : '')}
                  >
                    {t('frequency')}
                  </span>
                  <Icon
                    icon={sortIcon(isSorted)}
                    width={16}
                    className="inline-block text-zinc-400"
                  />
                </div>
              </div>
            </th>
          )
        },
        cell: ({ row, getValue }) => {
          const frequency = getValue()
          return (
            <div className="flex h-full items-center text-sm text-zinc-400">
              {row.getCanExpand() ? (
                <button
                  type="button"
                  onClick={row.getToggleExpandedHandler()}
                  className="flex h-full grow cursor-pointer items-center justify-between gap-1 px-3"
                >
                  <Icon
                    icon="lucide:chevron-right"
                    className={cn('text-zinc-300 transition-transform dark:text-zinc-600', row.getIsExpanded() ? 'rotate-90' : '')}
                    width={14}
                  />
                  <span className="float-right inline-block tabular-nums stretch-[condensed]">
                    {frequency}
                  </span>
                </button>
              ) : (
                <div className="w-full justify-end px-3">
                  <span className="float-right inline-block tabular-nums stretch-[condensed]">
                    {frequency}
                  </span>
                </div>
              )}
            </div>
          )
        },
        footer: ({ column }) => column.id,
      }),
      columnHelper.accessor((row) => row.word, {
        id: 'word',
        filterFn: (row, columnId, fn: ColumnFilterFn) => fn(row.original),
        header: ({ header }) => {
          const isSorted = header.column.getIsSorted()
          return (
            <th
              colSpan={header.colSpan}
              className={cn(
                'group/th border-y border-solid border-y-zinc-200 p-0 text-sm font-normal active:bg-stone-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400',
              )}
            >
              <div
                className="group flex h-7 cursor-pointer items-center gap-1.5 pr-1"
                onClick={header.column.getToggleSortingHandler()}
              >
                <Separator
                  orientation="vertical"
                  className="h-5 group-active:h-full group-[:has(:active)+th]/th:h-full"
                />
                <div
                  className="float-right flex grow select-none items-center"
                >
                  <span
                    title={t('Word')}
                    className={cn(
                      'grow text-left text-xs stretch-[condensed] before:invisible before:block before:h-0 before:overflow-hidden before:font-bold before:content-[attr(title)]',
                      isSorted ? 'font-semibold' : '',
                    )}
                  >
                    {t('Word')}
                  </span>
                  <Icon
                    icon={sortIcon(isSorted)}
                    width={16}
                    className="inline-block text-zinc-400"
                  />
                </div>
              </div>
            </th>
          )
        },
        cell: ({ row }) => {
          const { wFamily } = row.original
          return (
            <>
              {wFamily.map((w, i) => (
                <div
                  key={w}
                  className="ml-1.5 inline-block cursor-text select-text text-sm tracking-wider text-black ffs-['cv03','cv05','cv06'] dark:text-slate-300"
                  onClick={(ev) => ev.stopPropagation()}
                >
                  <span className={cn(i !== 0 && 'text-neutral-500 dark:text-slate-600')}>{w}</span>
                  {i !== wFamily.length - 1 && <span className="pr-1 text-neutral-300">, </span>}
                </div>
              ))}
            </>
          )
        },
        footer: ({ column }) => column.id,
      }),
      columnHelper.accessor((row) => row.word.length, {
        id: 'word.length',
        header: ({ header }) => {
          const isSorted = header.column.getIsSorted()
          return (
            <th
              colSpan={header.colSpan}
              className={cn(
                'group/th w-[0.1%] whitespace-nowrap border-y border-solid border-y-zinc-200 p-0 text-sm font-normal active:bg-stone-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400',
              )}
            >
              <div
                className="group float-right flex h-7 w-full cursor-pointer select-none items-center gap-1.5 pr-1 stretch-[condensed]"
                onClick={header.column.getToggleSortingHandler()}
              >
                <Separator
                  orientation="vertical"
                  className="h-5 group-active:h-full group-[:has(:active)+th]/th:h-full"
                />
                <div className="flex select-none items-center">
                  <span
                    title={t('length')}
                    className={cn('grow text-right text-xs before:invisible before:block before:h-0 before:overflow-hidden before:font-bold before:content-[attr(title)]', isSorted ? 'font-semibold' : '')}
                  >
                    {t('length')}
                  </span>
                  <Icon
                    icon={sortIcon(isSorted)}
                    width={16}
                    className="inline-block text-zinc-400"
                  />
                </div>
              </div>
            </th>
          )
        },
        cell: ({ getValue }) => {
          const wordLength = getValue()
          return (
            <div className="float-right mr-2 text-xs tabular-nums text-neutral-700 dark:text-neutral-500">
              <span>
                {wordLength}
              </span>
            </div>
          )
        },
        footer: ({ column }) => column.id,
      }),
      columnHelper.accessor((row) => {
        return row.learningPhase <= 1 ? row.learningPhase : row.inertialPhase
      }, {
        id: 'acquaintedStatus',
        filterFn: (row, columnId, fn: ColumnFilterFn) => fn(row.original),
        header: ({ header }) => {
          const isSorted = header.column.getIsSorted()
          return (
            <th
              colSpan={header.colSpan}
              className={cn(
                'group/th w-[0.1%] whitespace-nowrap border-y border-solid border-y-zinc-200 p-0 text-sm font-normal active:bg-stone-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400',
              )}
            >
              <div
                className="group flex h-7 cursor-pointer select-none items-center stretch-[condensed]"
                onClick={header.column.getToggleSortingHandler()}
              >
                <Separator
                  orientation="vertical"
                  className="h-5 group-active:h-full group-[:has(:active)+th]/th:h-full"
                />
                <div className="flex min-w-[30px] grow items-center justify-center text-zinc-400">
                  <Icon
                    icon={sortIcon(isSorted) || 'lucide:check-circle'}
                    width={16}
                  />
                </div>
              </div>
            </th>
          )
        },
        cell: ({ row }) => (
          <div className="flex justify-center">
            <VocabToggle
              row={{ vocab: row.original }}
              onToggle={handleVocabToggle}
            />
          </div>
        ),
        footer: ({ column }) => column.id,
      }),
      columnHelper.accessor((row) => row.rank, {
        id: 'rank',
        header: ({ header }) => {
          const isSorted = header.column.getIsSorted()
          return (
            <th
              colSpan={header.colSpan}
              className={cn(
                'group/th w-[0.1%] whitespace-nowrap border-y border-solid border-y-zinc-200 p-0 text-sm font-normal active:bg-stone-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400',
              )}
            >
              <div
                className="group float-right flex h-7 w-full cursor-pointer select-none items-center gap-2 pr-1 text-zinc-500 dark:text-zinc-400"
                onClick={header.column.getToggleSortingHandler()}
              >
                <Separator
                  orientation="vertical"
                  className="h-5 group-active:h-full group-[:has(:active)+th]/th:h-full"
                />
                <div className="flex h-5 items-center">
                  <span
                    title={t('rank')}
                    className={cn('grow text-right text-xs stretch-[condensed] before:invisible before:block before:h-0 before:overflow-hidden before:font-bold before:content-[attr(title)]', isSorted ? 'font-semibold' : '')}
                  >
                    {t('rank')}
                  </span>
                  <Icon
                    icon={sortIcon(isSorted)}
                    width={16}
                    className="inline-block text-zinc-400"
                  />
                </div>
              </div>
            </th>
          )
        },
        cell: ({ getValue }) => {
          const rank = getValue()
          return (
            <div className="float-right w-full text-center text-sm tabular-nums text-neutral-600 stretch-[condensed] dark:text-neutral-500">
              {rank}
            </div>
          )
        },
        footer: ({ column }) => column.id,
      }),
    ]
  }, [handleVocabToggle, t])

  const segments = [
    { value: 'all', label: t('all') },
    { value: 'new', label: t('new') },
    { value: 'acquainted', label: t('acquainted') },
  ] as const
  type Segment = typeof segments[number]['value']

  const [expanded, setExpanded] = useState<ExpandedState>({})
  const [sorting, setSorting] = useState<SortingState>([])
  const SEGMENT_NAME = 'source-table-segment'
  const [segment, setSegment] = useSessionStorage<Segment>(`${SEGMENT_NAME}-value`, 'all')

  const pageSize = 100
  const table = useReactTable({
    data,
    columns,
    state: {
      expanded,
      sorting,
    },
    initialState: {
      pagination: {
        pageSize,
      },
      columnFilters: [
        {
          id: 'acquaintedStatus',
          value: getAcquaintedStatusFilter(segment),
        },
      ],
    },
    autoResetPageIndex: false,
    onExpandedChange: setExpanded,
    onSortingChange: setSorting,
    getRowCanExpand: (row) => sentences.length > 0 && row.original.locations.length > 0,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getSortedRowModel: getSortedRowModel(),
    debugTable: true,
  })

  function handleSegmentChoose(newSegment: typeof segment) {
    onPurge()
    setSegment(newSegment)
    table.getColumn('acquaintedStatus')?.setFilterValue(() => getAcquaintedStatusFilter(newSegment))
  }

  function getAcquaintedStatusFilter(filterSegment: Segment): ColumnFilterFn {
    let filteredValue: LearningPhase[] = []
    if (filterSegment === 'new') {
      filteredValue = [LEARNING_PHASE.NEW, LEARNING_PHASE.RETAINING]
    } else if (filterSegment === 'acquainted') {
      filteredValue = [LEARNING_PHASE.ACQUAINTED, LEARNING_PHASE.FADING]
    } else {
      return () => true
    }

    return (row) => {
      return filteredValue.includes(row.inertialPhase)
    }
  }

  const columnWord = table.getColumn('word')

  function handleSearchChange(search: string) {
    setSearchValue(search)
    updateSearchFilter(search, useRegex)
  }

  function handleRegexChange(regex: boolean) {
    setUseRegex(regex)
    updateSearchFilter(searchValue, regex)
  }

  function updateSearchFilter(search: string, usingRegex: boolean) {
    if (usingRegex) {
      const newRegex = tryGetRegex(search)
      if (newRegex) {
        columnWord?.setFilterValue((): ColumnFilterFn => function regexFilterFn(row) {
          return newRegex.test(row.word)
        })
      }
    } else {
      columnWord?.setFilterValue((): ColumnFilterFn => function searchFilterFn(row) {
        return row.word.includes(search)
      })
    }
  }

  const { items } = usePagination({
    count: table.getPageCount(),
    page: table.getState().pagination.pageIndex + 1,
  })

  const rowsFiltered = table.getFilteredRowModel().rows
  const rowsCountAcquainted = rowsFiltered.filter((row) => row.original.learningPhase === LEARNING_PHASE.ACQUAINTED).length
  const rowsCountNew = rowsFiltered.filter((row) => row.original.learningPhase === LEARNING_PHASE.NEW).length

  const pages = [10, 20, 40, 50, 100, 200, 1000]
  const itemsNum = uniq([table.getPaginationRowModel().rows.length, rowsFiltered.length]).filter(Boolean).filter((n) => !pages.includes(n))

  return (
    <div className={cn('flex h-full flex-col items-center overflow-hidden bg-white shadow-sm will-change-transform dark:bg-slate-900', className)}>
      <div className="z-10 flex h-12 w-full justify-between bg-neutral-50 p-2 dark:bg-slate-900 dark:text-slate-400">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              className="flex max-h-full gap-1 p-2 text-neutral-500"
              variant="ghost"
            >
              <Icon
                icon="ion:ellipsis-horizontal-circle-outline"
                width={19}
              />
              <Icon
                icon="lucide:chevron-down"
                width={14}
              />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-52"
            align="start"
          >
            <DropdownMenuLabel>{t('Options')}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem
                onSelect={(e) => e.preventDefault()}
                className="p-0"
              >
                <AcquaintAllDialog
                  vocabulary={rowsFiltered.map((row) => row.original).filter((row) => row.learningPhase === LEARNING_PHASE.NEW && row.word.length <= 32)}
                />
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        <SearchWidget
          value={searchValue}
          useRegex={useRegex}
          onSearch={handleSearchChange}
          onRegex={handleRegexChange}
        />
      </div>
      <div className="h-px w-full border-b border-solid border-zinc-200 shadow-[0_0.4px_2px_0_rgb(0_0_0/0.05)] dark:border-slate-800" />
      <div className="w-full">
        <SegmentedControl
          value={segment}
          name={SEGMENT_NAME}
          segments={segments}
          onChoose={handleSegmentChoose}
          variant="ghost"
        />
      </div>
      <div className="w-full grow overflow-auto overflow-y-scroll overscroll-contain">
        <table className="min-w-full border-separate border-spacing-0">
          <thead className="sticky top-0 z-10 bg-white px-0">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHeader
                    key={header.id}
                    header={header}
                  />
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => {
              const canExpand = row.getCanExpand()
              return (
                <Fragment key={`_${row.original.word}`}>
                  <tr className={cn(
                    'group',
                    canExpand ? '[&:not(:has(+tr>td[colspan]))]:shadow-[inset_0px_-4px_10px_-6px_rgba(0,0,0,0.1)]' : '',
                  )}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className="h-8 border-t border-solid border-t-zinc-100 pl-0.5 group-first-of-type:border-t-0 dark:border-slate-800 [tr:has(+tr>td[colspan])>&]:border-b-white"
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </td>
                    ))}
                  </tr>
                  {canExpand && row.getIsExpanded() ? (
                    <tr>
                      <td
                        colSpan={row.getVisibleCells().length}
                        aria-label="Examples"
                        className="py-0"
                      >
                        <Examples
                          sentences={sentences}
                          src={row.original.locations}
                          className="text-xs tracking-wide"
                        />
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="flex w-full flex-wrap items-center justify-between gap-1 border-t border-t-zinc-200 px-0.5 py-1 tabular-nums dark:border-slate-800">
        <Pagination
          items={items}
          table={table}
        />
        <div className="flex grow items-center justify-end">
          <div className="flex items-center text-neutral-600">
            <Select
              defaultValue={String(pageSize)}
              onValueChange={(e) => {
                table.setPageSize(Number(e))
              }}
            >
              <SelectTrigger className="h-5 px-2 py-0 text-xs tabular-nums">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent
                position="item-aligned"
              >
                <SelectGroup>
                  {pages.map((size) => (
                    <SelectItem
                      className="pr-4 text-xs tabular-nums"
                      key={size}
                      value={String(size)}
                    >
                      {size}
                    </SelectItem>
                  ))}
                </SelectGroup>
                {itemsNum.length > 0 ? (
                  <>
                    <SelectSeparator />
                    <SelectGroup>
                      {itemsNum.map((size) => (
                        <SelectItem
                          className="pr-4 text-xs tabular-nums"
                          key={size}
                          value={String(size)}
                        >
                          {size}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </>
                ) : null}
              </SelectContent>
            </Select>
            <div className="whitespace-nowrap px-1 text-[.8125rem]">{`/${t('page')}`}</div>
          </div>
        </div>
      </div>
      <div className="flex w-full justify-center border-t border-solid border-t-zinc-200 bg-neutral-50 dark:border-slate-800 dark:bg-slate-900">
        <VocabStatics
          rowsCountFiltered={rowsFiltered.length}
          rowsCountNew={rowsCountNew}
          rowsCountAcquainted={rowsCountAcquainted}
        />
      </div>
    </div>
  )
}

export function Pagination<T>({
  items,
  table,
}: {
  items: UsePaginationItem[]
  table: Table<T>
}) {
  return (
    <div className="flex">
      {items.map(({
        page, type, selected, ...item
      }) => {
        const size = 16
        const className = 'flex items-center min-w-[1.625rem] justify-center rounded dark:text-slate-300 dark:disabled:text-zinc-700 border border-transparent text-xs tabular-nums disabled:text-zinc-300'
        const key = `${type}${page}`

        if (type === 'previous') {
          return (
            <button
              type="button"
              aria-label="Previous page"
              className={cn(className, 'px-0 text-zinc-500')}
              disabled={!table.getCanPreviousPage()}
              onClick={table.previousPage}
              key={key}
            >
              <Icon
                icon="lucide:chevron-left"
                width={size}
              />
            </button>
          )
        }

        if (type === 'start-ellipsis') {
          return (
            <button
              className={cn('group', className)}
              aria-label="Start ellipsis"
              type="button"
              onClick={() => {
                table.setPageIndex(Math.max(0, table.getState().pagination.pageIndex - 2))
              }}
              key={key}
            >
              <Icon
                icon="lucide:chevrons-left"
                className="hidden text-zinc-500 group-hover:inline-block"
                width={size}
              />
              <Icon
                icon="prime:ellipsis-h"
                className="text-zinc-600 group-hover:hidden"
                width={size}
              />
            </button>
          )
        }

        if (type === 'first' || type === 'page' || type === 'last') {
          return (
            <button
              className={cn(className, selected && 'border-border font-bold')}
              type="button"
              onClick={() => {
                table.setPageIndex(Number(page) - 1)
              }}
              key={key}
            >
              {page}
            </button>
          )
        }

        if (type === 'end-ellipsis') {
          return (
            <button
              className={cn('group', className)}
              type="button"
              aria-label="End ellipsis"
              onClick={() => {
                table.setPageIndex(Math.min(table.getState().pagination.pageIndex + 2, table.getPageCount() - 1))
              }}
              key={key}
            >
              <Icon
                icon="lucide:chevrons-right"
                className="hidden text-zinc-500 group-hover:inline-block"
                width={size}
              />
              <Icon
                icon="prime:ellipsis-h"
                className="text-zinc-600 group-hover:hidden"
                width={size}
              />
            </button>
          )
        }

        if (type === 'next') {
          return (
            <button
              className={cn('text-zinc-500', className)}
              type="button"
              aria-label="Next page"
              disabled={!table.getCanNextPage()}
              onClick={table.nextPage}
              key={key}
            >
              <Icon
                icon="lucide:chevron-right"
                width={size}
              />
            </button>
          )
        }

        return null
      })}
    </div>
  )
}

export function VocabStatics(props: { rowsCountFiltered: number, rowsCountNew: number, rowsCountAcquainted: number }) {
  const { t } = useTranslation()
  return (
    <div className="flex items-center py-1.5 text-xs tabular-nums text-neutral-600 dark:text-neutral-400">
      <span>
        {`${props.rowsCountFiltered.toLocaleString('en-US')} ${t('vocabulary')}`}
      </span>
      <div className="flex items-center gap-0.5">
        {props.rowsCountNew > 0 ? (
          <div className="flex items-center gap-2.5">
            <span className="text-neutral-400">, </span>
            <div className="flex items-center gap-1">
              <span>
                {props.rowsCountNew.toLocaleString('en-US')}
              </span>
              <Icon
                icon="lucide:circle"
                width={14}
                className="text-neutral-400"
              />
            </div>
          </div>
        ) : null}
        {props.rowsCountAcquainted > 0 ? (
          <div className="flex items-center gap-2.5">
            <span className="text-neutral-400">, </span>
            <div className="flex items-center gap-1">
              <span>
                {props.rowsCountAcquainted.toLocaleString('en-US')}
              </span>
              <Icon
                icon="lucide:check-circle"
                width={14}
                className="text-neutral-400"
              />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export function AcquaintAllDialog<T extends VocabState>({ vocabulary }: { vocabulary: T[] }) {
  const { t } = useTranslation()
  const { mutateAsync: mutateAcquaintWordsAsync } = useAcquaintWordsMutation()
  const username = useVocabStore((state) => state.username)
  function acquaintAllVocab(rows: T[]) {
    if (!username) {
      toast(<LoginToast />)
      return
    }

    mutateAcquaintWordsAsync(rows)
      .catch(console.error)
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <div className="flex w-full flex-row items-center gap-1.5 px-2 py-1.5">
          <Icon icon="solar:list-check-bold" />
          <div className="">{t('acquaintedAll')}</div>
        </div>
      </AlertDialogTrigger>
      <AlertDialogContent className="sm:max-w-[425px]">
        <AlertDialogHeader>
          <AlertDialogTitle>{t('acquaintedAll')}</AlertDialogTitle>
          <AlertDialogDescription>
            <Trans
              i18nKey="acquaintedAllConfirmText"
              count={vocabulary.length}
            >
              Are you sure to mark all (
              <span className="font-bold text-black">{{ count: vocabulary.length } as TI}</span>
              ) vocabulary as acquainted?
            </Trans>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="">
          <AlertDialogCancel>{t('Cancel')}</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              if (vocabulary.length > 0) {
                acquaintAllVocab(vocabulary)
              }
            }}
          >
            {t('Continue')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}