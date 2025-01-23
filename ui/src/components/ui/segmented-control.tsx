import type { VariantProps } from 'class-variance-authority'

import { cva } from 'class-variance-authority'

const segmentedControlVariants = cva(
  `grid w-full !touch-manipulation select-none auto-cols-[1fr] grid-flow-col overflow-hidden tracking-wide antialiased outline-none ffs-['cv08'] [text-rendering:geometricPrecision]`,
  {
    variants: {
      variant: {
        default: 'bg-[#EFEFF0] p-0.5 dark:bg-neutral-800/40',
        ghost: 'bg-transparent px-1.5 py-1',
      },
      size: {
        default: '',
        small: '',
        medium: '',
      },
    },
    compoundVariants: [
      {
        variant: 'default',
        className: 'group/default',
      },
      {
        variant: 'ghost',
        className: 'group/ghost',
      },
    ],
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

interface SegmentedControlProps<T extends string> extends
  HTMLAttributes<HTMLDivElement>,
  RefAttributes<HTMLDivElement>,
  VariantProps<typeof segmentedControlVariants> {
  value: NoInfer<T>
  segments: Readonly<{ value: T, label: string }[]>
  onChoose: (value: T) => void
}

export function SegmentedControl<T extends string>({
  value,
  segments,
  onChoose,
  variant,
  size,
  className,
  ref,
  ...props
}: SegmentedControlProps<T>) {
  const pillRefs = useRef<Partial<Record<T, HTMLSpanElement>>>({})

  function handleOnChange(newValue: T) {
    const pillRef = pillRefs.current[newValue]
    if (pillRef) {
      const previousPill = pillRefs.current[value]
      const domRect = previousPill?.getBoundingClientRect()
      activatePill(pillRef, domRect)
      onChoose(newValue)
    }
  }

  function activatePill(pillRef: HTMLElement, previousIndicatorClientRect?: DOMRect) {
    const element = pillRef

    if (
      !previousIndicatorClientRect
      || !element.getBoundingClientRect
    )
      return

    // https://github.com/angular/components/blob/a7f87a80a18a62d75a8c5621fd89dbc2cf28a865/src/material/tabs/ink-bar.ts#L114
    const currentClientRect = element.getBoundingClientRect()
    const widthDelta = previousIndicatorClientRect.width / currentClientRect.width
    const xPosition = previousIndicatorClientRect.left - currentClientRect.left
    element.style.setProperty(
      'transform',
      `translateX(${xPosition}px) scaleX(${widthDelta})`,
    )
    element.getBoundingClientRect()
    element.style.setProperty('transform', '')
  }

  function addToRefs(key: T) {
    return (el: HTMLDivElement) => {
      pillRefs.current[key] = el
    }
  }

  return (
    <Squircle
      ref={ref}
      squircle={{
        cornerRadius: 9,
      }}
      borderWidth={1}
      className={cn(segmentedControlVariants({ variant, size, className }))}
      {...props}
    >
      {segments.map((item) => (
        <Segment
          key={item.value}
          value={item.value}
          sqRef={addToRefs(item.value)}
          checked={item.value === value}
          label={item.label}
          onValueChange={handleOnChange}
        />
      ))}
    </Squircle>
  )
}

function Segment<T extends string>({
  value,
  label,
  checked,
  onValueChange,
  sqRef,
  className,
  ...props
}: {
  value: T
  label: string
  onValueChange: (value: T) => void
  checked: boolean
  sqRef: Ref<HTMLDivElement>
} & React.HTMLAttributes<HTMLDivElement> & RefAttributes<HTMLDivElement>) {
  const id = useId()
  return (
    <div
      className={cn('group/d relative first-of-type:col-[1] first-of-type:row-[1] first-of-type:shadow-none', className)}
      {...props}
    >
      <input
        id={id}
        aria-label="Segmented control"
        type="radio"
        value={value}
        checked={checked}
        className="group/i peer absolute inset-0 appearance-none opacity-0 outline-none"
        onChange={() => {
          onValueChange(value)
        }}
      />
      <label
        htmlFor={id}
        className="group/l relative block cursor-pointer bg-transparent text-center before:absolute before:inset-y-[14%] before:left-0 before:w-px before:translate-x-[-.5px] before:rounded-[10px] before:bg-neutral-300 before:transition-[background] before:duration-200 before:ease-[ease] before:will-change-[background] group-first-of-type/d:before:opacity-0 group-[:has(:checked)+*]/d:before:bg-transparent peer-checked:cursor-default peer-checked:before:z-10 peer-checked:before:bg-transparent dark:before:bg-slate-700"
      >
        <div className="flex flex-col justify-center text-sm/6 group-[]/ghost:leading-[1.375rem]">
          <div
            className="relative z-10 flex justify-center text-black transition-all duration-200 ease-[ease] will-change-transform group-hover/d:opacity-20 group-focus/d:opacity-20 group-active/d:opacity-20 group-active/d:delay-150 group-active/d:group-[:not(:checked)+label]/i:scale-95 peer-checked:group-[]/l:font-medium peer-checked:group-[]/l:opacity-100 dark:text-white"
          >
            {label}
          </div>
          <div
            title={label}
            className="before:invisible before:block before:h-0 before:overflow-hidden before:font-bold before:content-[attr(title)]"
          />
        </div>
        <div className="absolute left-0 top-0 size-full">
          <Squircle
            ref={sqRef}
            squircle={{
              cornerRadius: 7,
            }}
            borderWidth={0.5}
            className={cn(
              'flex size-full ease-[ease] will-change-transform group-[]/default:peer-checked:group-[]/l:border-0 group-[]/default:peer-checked:group-[]/l:bg-black/[.04] group-[]/ghost:peer-checked:group-[]/l:bg-neutral-200 peer-checked:group-[]/l:bg-white group-[]/default:peer-checked:group-[]/l:shadow group-[]/default:peer-checked:group-[]/l:before:bg-white dark:group-[]/ghost:peer-checked:group-[]/l:bg-slate-600 dark:group-[]/default:peer-checked:group-[]/l:before:bg-neutral-600',
              checked && 'transition-transform duration-300',
            )}
          />
        </div>
      </label>
    </div>
  )
}
