import type { Cell, Row } from '@tanstack/react-table'
import type { ReactElement, RefObject } from 'react'

import { Slot } from '@radix-ui/react-slot'
import { flexRender } from '@tanstack/react-table'
import { useRetimer } from 'foxact/use-retimer'
import { sum } from 'lodash-es'
import React from 'react'
import { useInView } from 'react-intersection-observer'

import type { RowSelectionChangeFn } from '@/types/utils'
import type { GroupHeader } from '@/types/vocab'

import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible'
import { useRect } from '@/lib/hooks'
import { mergeRefs } from '@/lib/merge-refs'

const HEAD_HEIGHT = 30

export function TableHeader({
  children,
  className = '',
  style,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement> & React.RefAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      style={{
        '--z-index': 999_999_999,
        '--height': `${HEAD_HEIGHT}px`,
        ...style,
      }}
      className={cn(
        'sticky top-0 z-[--z-index] h-[--height] bg-background px-0',
        className,
      )}
      {...props}
    >
      {children}
    </thead>
  )
}

export function TableHeaderCellRender<T>({ header }: { header: GroupHeader<T> }) {
  'use no memo'
  return (
    header.isPlaceholder ? (
      <TableHeaderCell header={header} />
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

export function TableHeaderCell<T>({
  header: {
    id,
    colSpan,
  },
  children,
  className = '',
}: {
  header: GroupHeader<T>
  children?: ReactElement
  className?: string
}) {
  return (
    <th
      key={id}
      colSpan={colSpan}
      className={cn(
        'group/th whitespace-nowrap border-y border-solid border-y-zinc-200 bg-background p-0 text-xs font-normal dark:border-slate-800',
        className,
      )}
    >
      <Slot className="flex size-full h-7 cursor-pointer items-center">
        {children}
      </Slot>
    </th>
  )
}

export function TableDataCell<T>({
  cell: {
    id,
  },
  children,
  className = '',
}: {
  cell: Cell<T, unknown>
  children?: ReactElement
  className?: string
}) {
  return (
    <td
      key={id}
      className={cn(
        'h-8 border-y border-solid border-b-transparent border-t-border-td p-0 text-sm group-first-of-type/tr:border-t-transparent group-data-[boundary]/tr:border-b-border-td',
        className,
      )}
    >
      {children?.type === React.Fragment ? children : (
        <Slot className="flex size-full items-center pl-0.5 pr-px">
          {children}
        </Slot>
      )}
    </td>
  )
}

type RowProp<T> = {
  row: Row<T>
  onRowSelectionChange?: RowSelectionChangeFn<T>
} & (ExpandProp | Partial<ExpandProp>)

type ExpandProp = {
  children: ReactElement
  index: number
  rootRef: RefObject<HTMLDivElement | null>
}

const ANIM_DURATION = 300

const SHADOW_DURATION = 400

export function TableRow<T>({
  row: {
    id,
    subRows,
    toggleExpanded,
    getCanExpand,
    getIsExpanded,
    getVisibleCells,
  },
  rootRef,
  index = 0,
  children,
  onRowSelectionChange,
}: RowProp<T>) {
  const rowRef = useRef<HTMLTableRowElement>(null!)
  const { height: rowHeight } = useRect(rowRef)
  const detailRef = useRef<HTMLTableRowElement>(null)
  // eslint-disable-next-line react-compiler/react-compiler
  const detailElement = detailRef.current
  const root = rootRef?.current ?? null
  const [open, setOpen] = useState(getIsExpanded)
  const [animationOpen, setAnimationOpen] = useState(false)
  const retimerAnim = useRetimer()
  const [transitionOpen, setTransitionOpen] = useState(false)
  const retimerTransition = useRetimer()

  function handleToggleExpanded(isClosing: boolean) {
    const isOpening = !isClosing
    setAnimationOpen(true)
    setTransitionOpen(true)
    if (detailElement || !children) {
      setOpen(isOpening)
      toggleExpanded()
    }
    else {
      requestAnimationFrame(() => {
        setOpen(isOpening)
        toggleExpanded()
      })
    }
    if (isOpening)
      retimerAnim(setTimeout(() => setAnimationOpen(false), ANIM_DURATION))

    retimerTransition(setTimeout(() => setTransitionOpen(false), SHADOW_DURATION))
    if (root) {
      const rowElement = rowRef.current
      if (rowElement.getBoundingClientRect().y - root.getBoundingClientRect().y <= HEAD_HEIGHT) {
        if (isClosing && detailElement) {
          const subRowsHeight = sum(subRows.map((subRow) => document.getElementById(subRow.id)).map((e) => e?.offsetHeight))
          const overlapHeight = rowElement.offsetTop + rowHeight - detailElement.offsetTop
          const expandedHeight = detailElement.offsetHeight + subRowsHeight
          if (overlapHeight < expandedHeight) {
            // subRow / isDetailVisibleIntersecting
            root.scrollTo({
              top: -HEAD_HEIGHT - rowHeight + detailElement.offsetTop,
            })
          }
          else {
            // isDetailAboveRoot
            root.scrollTo({
              top: -HEAD_HEIGHT + rowElement.offsetTop - expandedHeight,
              behavior: isClosing ? 'instant' : 'smooth',
            })
          }
        }
        else {
          root.scrollTo({
            top: -HEAD_HEIGHT + rowElement.offsetTop,
            behavior: 'smooth',
          })
        }
      }
    }
  }

  const [detailRef2, , detailEntry] = useInView({
    root,
    rootMargin: `${-HEAD_HEIGHT - rowHeight}px 0% 0%`,
  })
  const isDetailAboveRoot = detailEntry && detailEntry.boundingClientRect.bottom < (detailEntry.rootBounds?.top ?? 0)
  const [detailRef3, , detailEntry2] = useInView({
    root,
    rootMargin: `${-HEAD_HEIGHT - rowHeight + 1}px 0% -100%`,
  })
  const isDetailVisibleIntersecting = Boolean(detailEntry2?.isIntersecting)
  const visibleCells = getVisibleCells()
  const state = open ? 'open' : 'closed'

  return (
    <>
      <tr
        ref={rowRef}
        id={id}
        style={{
          '--top': `${HEAD_HEIGHT}px`,
          '--z-index': index + (open && subRows.length ? 1 + subRows.length : 0),
        }}
        className="group/tr relative z-[--z-index] bg-background transition-shadow duration-0 data-[state=open]:sticky data-[state=open]:top-[--top] data-[boundary]:!shadow-intersect [[data-boundary]+*:empty+&>*]:border-t-transparent [[data-detail-above]+&]:shadow-collapse [[data-detail-above]+&]:duration-200 [[data-state=closed]+&]:shadow-collapse [[data-state=closed][data-disabled]+&]:shadow-none [[data-transition-open]+&]:duration-300"
        data-disabled={!getCanExpand() || undefined}
        data-state={state}
        data-boundary={(isDetailAboveRoot ? open : isDetailVisibleIntersecting) && !animationOpen ? '' : undefined}
      >
        {/* eslint-disable-next-line react-compiler/react-compiler */}
        {visibleCells.map((cell) => (
          <Fragment key={cell.id}>
            {flexRender(
              cell.column.columnDef.cell,
              {
                ...cell.getContext(),
                onExpandedChange: handleToggleExpanded,
                onRowSelectionChange,
              },
            )}
          </Fragment>
        ))}
      </tr>
      {detailElement || open || animationOpen ? (
        <tr
          ref={mergeRefs(
            // eslint-disable-next-line react-compiler/react-compiler
            detailRef,
            detailRef2,
            detailRef3,
          )}
          style={{
            '--z-index': index - 1,
          }}
          data-state={state}
          data-detail-above={isDetailAboveRoot || undefined}
          data-transition-open={transitionOpen || undefined}
          className="relative z-[--z-index] bg-background"
        >
          {children ? (
            <td
              colSpan={visibleCells.length}
              className="p-0"
            >
              <Collapsible
                open={open}
              >
                <CollapsibleContent
                  data-no-anim-open={!animationOpen || undefined}
                  data-no-anim-closed={(isDetailAboveRoot && !open) || undefined}
                  className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down data-[no-anim-closed]:data-[state=closed]:anim-duration-0 data-[no-anim-open]:data-[state=open]:anim-duration-0"
                >
                  {children}
                </CollapsibleContent>
              </Collapsible>
            </td>
          ) : null}
        </tr>
      ) : null}
    </>
  )
}
