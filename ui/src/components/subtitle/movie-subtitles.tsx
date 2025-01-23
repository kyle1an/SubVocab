import type { InitialTableState } from '@tanstack/react-table'

import usePagination from '@mui/material/usePagination'
import NumberFlow from '@number-flow/react'
import { createColumnHelper, getCoreRowModel, getExpandedRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table'

import type { SubtitleResponseData } from '@/api/opensubtitles'

import { useOpenSubtitlesSubtitles } from '@/api/opensubtitles'
import { useCommonColumns } from '@/components/subtitle/columns'
import { TablePagination } from '@/components/table-pagination'
import { TablePaginationSizeSelect } from '@/components/table-pagination-size-select'
import { TableRow } from '@/components/ui/table-element'
import { SortIcon } from '@/lib/icon-utils'
import { getFileId } from '@/lib/subtitle'
import { sortBySelection } from '@/lib/table-utils'
import { findClosest } from '@/lib/utilities'
import { subtitleSelectionStateFamily } from '@/store/useVocab'

type SubtitleData = SubtitleResponseData

function useMovieColumns<T extends SubtitleData>() {
  const { t } = useTranslation()
  const columnHelper = createColumnHelper<T>()
  return [
    columnHelper.accessor((row) => row.id, {
      id: 'action',
      sortingFn: sortBySelection,
      header: ({ header }) => {
        const isSorted = header.column.getIsSorted()
        return (
          <TableHeaderCell
            header={header}
            className="w-[.1%] [&:active:has(.child:not(:active))+th]:signal/active [&:active:has(.child:not(:active))]:signal/active"
          >
            <Div
              className="select-none justify-between gap-1 pl-2 pr-1 signal/active:bg-background-active"
              onClick={header.column.getToggleSortingHandler()}
            >
              <div className="child flex stretch-[condensed]" />
              <SortIcon isSorted={isSorted} />
            </Div>
          </TableHeaderCell>
        )
      },
      cell: ({ row, cell, onRowSelectionChange }) => {
        const canExpand = row.getCanExpand()
        return (
          <TableDataCell
            cell={cell}
          >
            <Div className="text-zinc-400">
              <div
                className={cn(
                  'flex h-full grow items-center justify-between pl-1.5 pr-1',
                  canExpand && 'cursor-pointer',
                )}
              >
                <Checkbox
                  variant="radio"
                  onClick={(e) => e.stopPropagation()}
                  checked={row.getIsSelected()}
                  onCheckedChange={(checked) => {
                    onRowSelectionChange?.(checked, row, 'singleRow')
                  }}
                />
                {'\u200B'}
              </div>
            </Div>
          </TableDataCell>
        )
      },
    }),
  ]
}

const PAGE_SIZES = [5, 10, 20, 40, 50, 100, 200] as const

const initialTableState: InitialTableState = {
  sorting: [
    {
      id: 'download_count',
      desc: true,
    },
  ],
  columnOrder: ['action', 'year', 'media_type', 'movie_name', 'language', 'download_count'],
  pagination: {
    pageSize: findClosest(10, PAGE_SIZES),
    pageIndex: 0,
  },
}

export function MovieSubtitleFiles({
  id,
}: {
  id: number
}) {
  // eslint-disable-next-line react-compiler/react-compiler
  'use no memo'
  const { t } = useTranslation()
  const { data, isPending } = useOpenSubtitlesSubtitles({
    type: 'movie',
    tmdb_id: id,
    languages: 'en',
    per_page: 100,
  })
  const commonColumns = useCommonColumns<SubtitleData>()
  const movieColumns = useMovieColumns()
  const columns = [...commonColumns, ...movieColumns]
  const [rowSelection = {}, setRowSelection] = useAtom(subtitleSelectionStateFamily(id))
  const table = useReactTable({
    data: data?.data ?? [],
    columns,
    initialState: initialTableState,
    state: {
      rowSelection,
    },
    autoResetPageIndex: false,
    getRowId: getFileId,
    getRowCanExpand: () => false,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getSortedRowModel: getSortedRowModel(),
    debugTable: true,
  })
  const rowsFiltered = table.getFilteredRowModel().rows
  const tableState = table.getState()
  const { items } = usePagination({
    count: table.getPageCount(),
    page: tableState.pagination.pageIndex + 1,
  })

  return (
    <div className="px-6 pb-5 pt-2 md:pl-24 md:pr-12">
      <SquircleBg className="flex h-[286px] items-center justify-center overflow-hidden rounded-xl border">
        <SquircleMask
          className="flex size-full flex-col bg-[--theme-bg]"
        >
          <div>
            <div className="flex h-9 gap-2 p-1.5">
              <div className="flex aspect-square items-center justify-center">
                {isPending ? (
                  <IconLucideLoader2
                    className="animate-spin"
                  />
                ) : null}
              </div>
            </div>
          </div>
          <div
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
                      onRowSelectionChange={setRowSelection}
                    />
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
    </div>
  )
}
