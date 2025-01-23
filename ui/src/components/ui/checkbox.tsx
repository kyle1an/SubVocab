import type { VariantProps } from 'class-variance-authority'

import * as CheckboxPrimitive from '@radix-ui/react-checkbox'
import { CheckIcon } from '@radix-ui/react-icons'
import { cva } from 'class-variance-authority'

const checkboxVariants = cva(
  cn(
    'peer size-4 shrink-0 rounded-sm border border-primary shadow focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground',
  ),
  {
    variants: {
      variant: {
        default: cn(
          'drop-shadow-md squircle sq-radius-[3.2] sq-outline-[1.07] sq-stroke-[hsl(var(--primary))] data-[state=checked]:drop-shadow data-[state=checked]:sq-outline-0 data-[state=checked]:sq-fill-[hsl(var(--primary))] sq:rounded-none sq:border-0 sq:shadow-none data-[state=checked]:sq:bg-transparent',
          '[--offset:2px] [--sq-r:2] focus-visible:after:squircle focus-visible:after:sq-radius-[calc(var(--sq-r)+var(--offset))] focus-visible:after:sq-outline-[1.1] focus-visible:after:sq-stroke-[hsl(var(--ring))] sq:focus-visible:ring-0 sq:focus-visible:after:absolute sq:focus-visible:after:-left-[--offset] sq:focus-visible:after:-top-[--offset] sq:focus-visible:after:size-[calc(100%+2*var(--offset))]',
        ),
        radio: 'rounded-full [&_svg]:h-[15px]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

function Checkbox({
  className,
  variant,
  ref,
  ...props
}: React.ComponentPropsWithRef<typeof CheckboxPrimitive.Root> & VariantProps<typeof checkboxVariants>) {
  return (
    <CheckboxPrimitive.Root
      ref={ref}
      className={cn(
        checkboxVariants({ variant, className }),
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        className={cn('flex items-center justify-center text-current')}
      >
        <CheckIcon className="size-4" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}
Checkbox.displayName = CheckboxPrimitive.Root.displayName

export { Checkbox }
