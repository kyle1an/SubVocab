import type { InitialTableState } from '@tanstack/react-table'

import usePagination from '@mui/material/usePagination'
import NumberFlow from '@number-flow/react'
import { useUnmountEffect } from '@react-hookz/web'
import { createColumnHelper, getCoreRowModel, getExpandedRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table'
import { useDebouncedValue } from 'foxact/use-debounced-value'
import { useNavigate } from 'react-router'

import type { paths as PathsThemoviedb } from '@/types/schema-themoviedb'

import { useOpenSubtitlesDownload } from '@/api/opensubtitles'
import { $api } from '@/api/tmdb'
import { MediaDetails } from '@/components/media-details'
import { OpensubtitlesAuthentication } from '@/components/subtitle/opensubtitles-authentication'
import { TablePagination } from '@/components/table-pagination'
import { TablePaginationSizeSelect } from '@/components/table-pagination-size-select'
import { TableDataCell, TableHeaderCell, TableHeaderCellRender, TableRow } from '@/components/ui/table-element'
import { SortIcon } from '@/lib/icon-utils'
import { findClosest } from '@/lib/utilities'
import { fileIdsAtom, sourceTextAtom, subtitleDownloadProgressAtom, subtitleSelectionStateAtom } from '@/store/useVocab'

const mediaSearchAtom = atomWithStorage('mediaSearchAtom', '')

type TableData = NonNullable<PathsThemoviedb['/3/search/multi']['get']['responses'][200]['content']['application/json']['results']>[number]

type ColumnFilterFn = (rowValue: TableData) => boolean

const PAGE_SIZES = [5, 10, 20] as const

const initialTableStateAtom = atom<InitialTableState>({
  pagination: {
    pageSize: findClosest(100, PAGE_SIZES),
    pageIndex: 0,
  },
})

function useColumns<T extends TableData>() {
  // Add this to prevent all columns from re-rendering on sort
  const { t } = useTranslation()
  const columnHelper = createColumnHelper<T>()
  return [
    columnHelper.accessor((row) => row.id, {
      id: 'action',
      header: ({ header }) => {
        const isSorted = header.column.getIsSorted()
        return (
          <TableHeaderCell
            header={header}
            className="w-[.1%] active:signal/active [&:active+th]:signal/active"
          >
            <Div
              className="min-w-10 select-none justify-center gap-2 signal/active:bg-background-active"
              onClick={header.column.getToggleSortingHandler()}
            >
              <div
                className="flex stretch-[condensed]"
              >
                <SortIcon isSorted={isSorted} />
              </div>
            </Div>
          </TableHeaderCell>
        )
      },
      cell: ({ row, cell, onExpandedChange }) => {
        const isExpanded = row.getIsExpanded()
        return (
          <TableDataCell
            cell={cell}
          >
            <Div className="text-zinc-400">
              {row.getCanExpand() ? (
                <div
                  className="flex h-full grow cursor-pointer select-none items-center justify-center"
                  onClick={() => {
                    onExpandedChange?.(isExpanded)
                  }}
                >
                  {/*
                <Checkbox
                  onClick={(e) => e.stopPropagation()}
                />
                */}
                  {/* https://stackoverflow.com/questions/2876424/html-double-click-selection-oddity */}
                  {'\u200B'}
                  <IconLucideChevronRight
                    className={cn(
                      'size-[14px] text-zinc-400 transition-transform dark:text-zinc-500',
                      isExpanded ? 'rotate-90' : '',
                    )}
                  />
                </div>
              ) : (
                <div className="w-full justify-end px-3">
                  <Checkbox
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              )}
            </Div>
          </TableDataCell>
        )
      },
    }),
    columnHelper.accessor((row) => row.release_date ?? row.first_air_date, {
      id: 'upload_date',
      header: ({ header }) => {
        const title = 'Year'
        const isSorted = header.column.getIsSorted()
        return (
          <TableHeaderCell
            header={header}
            className="w-[.1%] active:bg-background-active active:signal/active [&:active+th]:signal/active"
          >
            <Div
              className="group select-none gap-2 pr-1"
              onClick={header.column.getToggleSortingHandler()}
            >
              <Separator
                orientation="vertical"
                className="h-5 signal/active:h-full"
              />
              <div
                className="float-right flex grow select-none items-center"
              >
                <span
                  title={title}
                  className={cn('grow text-left stretch-[condensed] before:invisible before:block before:h-0 before:overflow-hidden before:font-bold before:content-[attr(title)]', isSorted ? 'font-semibold' : '')}
                >
                  {title}
                </span>
                <SortIcon isSorted={isSorted} />
              </div>
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
              {value ? format(value, 'yyyy') : null}
            </Div>
          </TableDataCell>
        )
      },
    }),
    columnHelper.accessor((row) => row.media_type, {
      id: 'media_type',
      header: ({ header }) => {
        const title = 'Media'
        const isSorted = header.column.getIsSorted()
        return (
          <TableHeaderCell
            header={header}
            className="w-[.1%] active:bg-background-active active:signal/active [&:active+th]:signal/active"
          >
            <Div
              className="group select-none gap-2 pr-1"
              onClick={header.column.getToggleSortingHandler()}
            >
              <Separator
                orientation="vertical"
                className="h-5 signal/active:h-full"
              />
              <div className="flex items-center">
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
      cell: ({ cell, getValue }) => {
        const value = getValue()
        return (
          <TableDataCell
            cell={cell}
          >
            <Div
              className="justify-center capitalize tabular-nums stretch-[condensed] data-[value='tv']:uppercase"
              data-value={value}
            >
              {value}
            </Div>
          </TableDataCell>
        )
      },
    }),
    columnHelper.accessor((row) => row.title ?? row.original_title ?? row.original_name, {
      id: 'movie_name',
      filterFn: (row, columnId, fn: ColumnFilterFn) => fn(row.original),
      header: ({ header }) => {
        const title = 'Name'
        const isSorted = header.column.getIsSorted()
        return (
          <TableHeaderCell
            header={header}
            className="active:bg-background-active active:signal/active [&:active+th]:signal/active"
          >
            <Div
              className="group gap-2 pr-1"
              onClick={header.column.getToggleSortingHandler()}
            >
              <Separator
                orientation="vertical"
                className="h-5 signal/active:h-full"
              />
              <div
                className="float-right flex grow select-none items-center"
              >
                <span
                  title={title}
                  className={cn(
                    'grow text-left stretch-[condensed] before:invisible before:block before:h-0 before:overflow-hidden before:font-bold before:content-[attr(title)]',
                    isSorted ? 'font-semibold' : '',
                  )}
                >
                  {title}
                </span>
                <SortIcon isSorted={isSorted} />
              </div>
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
            <Div
              className="cursor-text select-text pl-2.5 tracking-wider ffs-['cv03','cv05','cv06']"
              onClick={(ev) => ev.stopPropagation()}
            >
              <span>{value}</span>
            </Div>
          </TableDataCell>
        )
      },
    }),
    columnHelper.accessor((row) => row.vote_average, {
      id: 'vote_average',
      header: ({ header }) => {
        const title = 'Vote'
        const isSorted = header.column.getIsSorted()
        return (
          <TableHeaderCell
            header={header}
            className="w-[.1%] active:bg-background-active active:signal/active [&:active+th]:signal/active"
          >
            <Div
              className="group select-none gap-2 pr-1 stretch-[condensed]"
              onClick={header.column.getToggleSortingHandler()}
            >
              <Separator
                orientation="vertical"
                className="h-5 signal/active:h-full"
              />
              <div className="flex items-center">
                <span
                  title={title}
                  className={cn('grow text-right before:invisible before:block before:h-0 before:overflow-hidden before:font-bold before:content-[attr(title)]', isSorted ? 'font-semibold' : '')}
                >
                  {title}
                </span>
                <SortIcon isSorted={isSorted} />
              </div>
            </Div>
          </TableHeaderCell>
        )
      },
      cell: ({ cell, row, getValue }) => {
        const value = getValue()
        return (
          <TableDataCell
            cell={cell}
          >
            <Div className="pr-2 tabular-nums">
              <span>
                {row.original.vote_count >= 1 ? value : null}
              </span>
            </Div>
          </TableDataCell>
        )
      },
    }),
    columnHelper.accessor((row) => row.popularity, {
      id: 'popularity',
      header: ({ header }) => {
        const title = 'Popularity'
        const isSorted = header.column.getIsSorted()
        return (
          <TableHeaderCell
            header={header}
            className="w-[.1%] active:bg-background-active active:signal/active [&:active+th]:signal/active"
          >
            <Div
              className="group select-none gap-2 pr-1"
              onClick={header.column.getToggleSortingHandler()}
            >
              <Separator
                orientation="vertical"
                className="h-5 signal/active:h-full"
              />
              <div className="flex items-center">
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
      cell: ({ cell, getValue }) => {
        const value = getValue().toFixed(3)
        return (
          <TableDataCell
            cell={cell}
          >
            <Div className="justify-end pr-4 text-xs tabular-nums stretch-[condensed]">
              <span>
                {value}
              </span>
            </Div>
          </TableDataCell>
        )
      },
    }),
  ]
}

export function Subtitles() {
  // eslint-disable-next-line react-compiler/react-compiler
  'use no memo'
  const { isPending: isDownloadPending, mutateAsync: download } = useOpenSubtitlesDownload()
  const [query, setQuery] = useAtom(mediaSearchAtom)
  const [initialTableState, setInitialTableState] = useAtom(initialTableStateAtom)
  const debouncedQuery = useDebouncedValue(query, 500)
  const columns = useColumns()
  const setSourceText = useSetAtom(sourceTextAtom)
  const [subtitleDownloadProgress, setSubtitleDownloadProgress] = useAtom(subtitleDownloadProgressAtom)
  const { data: movie, isFetching: isSearchLoading } = $api.useQuery(
    'get',
    '/3/search/multi',
    {
      params: {
        query: {
          query: debouncedQuery,
        },
      },
    },
    {
      enabled: Boolean(debouncedQuery),
      placeholderData: (prev) => prev,
    },
  )
  const table = useReactTable({
    data: movie?.results ?? [],
    columns,
    initialState: initialTableState,
    autoResetPageIndex: false,
    getRowId: (row) => String(row.id),
    getRowCanExpand: () => true,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getSortedRowModel: getSortedRowModel(),
    debugTable: true,
  })
  const rowsFiltered = table.getFilteredRowModel().rows
  const navigate = useNavigate()
  const [isPending, starTransition] = useTransition()
  const setSubtitleSelectionState = useSetAtom(subtitleSelectionStateAtom)
  const [fileIds] = useAtom(fileIdsAtom)

  async function getFiles(fileIds: number[]) {
    starTransition(async () => {
      const fileTexts = await Promise.all(fileIds.map(async (id) => {
        const { text } = await download({
          file_id: id,
        })
        return text
      }))
      setSubtitleDownloadProgress([])
      setSourceText((v) => ({
        text: fileTexts.join('\n'),
        version: v.version++,
      }))
      navigate('/')
    })
  }

  function clearSelection() {
    setSubtitleSelectionState({})
  }

  const tableState = table.getState()
  const { items } = usePagination({
    count: table.getPageCount(),
    page: tableState.pagination.pageIndex + 1,
  })
  const { t } = useTranslation()

  useUnmountEffect(() => {
    setInitialTableState(tableState)
  })
  const rootRef = useRef<HTMLDivElement>(null)

  return (
    <SquircleBg className="flex h-[calc(100%-4px*14)] items-center justify-center overflow-hidden rounded-xl border">
      <SquircleMask
        className="flex size-full flex-col bg-[--theme-bg]"
      >
        <div>
          <div className="flex h-12 gap-2 p-2">
            <InputWrapper className="[--sq-r:6] after:sq-smooth-[0.8]">
              <Input
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                }}
                className="h-full text-base sq-smooth-[0.9] md:text-sm"
              />
            </InputWrapper>
            <div className="flex aspect-square h-full items-center justify-center">
              {isSearchLoading ? (
                <IconLucideLoader2
                  className="animate-spin"
                />
              ) : null}
            </div>
            <div className="grow"></div>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  className="h-full gap-1.5 px-3"
                >
                  <IconOuiTokenKey className="min-w-[1em]" />
                  <span className="hidden md:block">
                    OpenSubtitles Login
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72">
                <OpensubtitlesAuthentication />
              </PopoverContent>
            </Popover>
            <Button
              className="h-full gap-1.5 px-3"
              variant="outline"
              disabled={fileIds.length === 0}
              onClick={clearSelection}
            >
              <IconF7MultiplyCircle className="min-w-[1em]" />
              <span className="hidden md:block">
                Clear
              </span>
            </Button>
            <Button
              className="h-full gap-1.5 px-3 tabular-nums"
              onClick={() => {
                getFiles(fileIds)
              }}
              disabled={fileIds.length === 0 || isDownloadPending}
            >
              {isDownloadPending || isPending ? (
                <IconLucideLoader2
                  className="min-w-[1em] animate-spin"
                />
              ) : (
                <IconF7ArrowDownCircleFill className="min-w-[1em]" />
              )}
              <span className="hidden md:block">
                Download
              </span>
              {isDownloadPending ? (
                <div className="flex items-center gap-1.5">
                  <span>
                    <NumberFlow
                      value={subtitleDownloadProgress.length}
                    />
                    {` / `}
                    <NumberFlow
                      value={fileIds.length}
                    />
                  </span>
                </div>
              ) : (
                <NumberFlow
                  value={fileIds.length}
                  className={clsx(fileIds.length === 0 ? 'hidden' : '')}
                  isolate
                />
              )}
            </Button>
          </div>
        </div>
        <div
          ref={rootRef}
          className="grow overflow-auto overflow-y-scroll overscroll-contain"
        >
          <table className="relative border-separate border-spacing-0">
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
                    <MediaDetails
                      id={row.original.id}
                      media_type={row.original.media_type}
                    />
                  </TableRow>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-0.5 border-t border-t-zinc-200 py-1 pr-0.5 tabular-nums dark:border-slate-800">
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
        <div className="flex justify-center border-t border-solid border-t-zinc-200 bg-background dark:border-slate-800">
          <div className="flex h-7 items-center text-xs tabular-nums">
            <span>
              <NumberFlow
                value={rowsFiltered.length}
                locales="en-US"
                animated
                isolate
              />
              <span>
                {` items`}
              </span>
            </span>
          </div>
        </div>
      </SquircleMask>
    </SquircleBg>
  )
}
