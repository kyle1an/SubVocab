import type { VariantProps } from 'class-variance-authority'

import { Slot } from '@radix-ui/react-slot'
import { cva } from 'class-variance-authority'

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors [--offset:1px] [--sq-r:6px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: cn(
          'bg-primary text-primary-foreground shadow hover:bg-primary/90',
          'squircle sq-radius-[--sq-r] sq-fill-[hsl(var(--primary))] hover:sq-fill-[hsl(var(--primary)/0.9)] sq:bg-transparent sq:shadow-none sq:drop-shadow',
          'relative focus-visible:after:squircle focus-visible:after:sq-radius-[calc(var(--sq-r)+var(--offset))] focus-visible:after:sq-outline focus-visible:after:sq-stroke-[hsl(var(--ring))] sq:focus-visible:ring-0 sq:focus-visible:after:absolute sq:focus-visible:after:-left-[--offset] sq:focus-visible:after:-top-[--offset] sq:focus-visible:after:size-[calc(100%+2*var(--offset))]',
        ),
        destructive:
          'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90',
        outline: cn(
          'border border-input bg-transparent shadow-sm hover:bg-accent hover:text-accent-foreground',
          'squircle sq-radius-[--sq-r] sq-outline-[--l-w] sq-stroke-[hsl(var(--input))] sq-fill-[--bg-] [--l-w:1px] hover:sq-fill-[hsl(var(--accent))] sq:border-0 sq:shadow-none sq:drop-shadow-sm',
          'relative focus-visible:after:squircle focus-visible:after:sq-radius-[calc(var(--sq-r)+var(--offset)-0.5px)] focus-visible:after:sq-outline focus-visible:after:sq-stroke-[hsl(var(--ring))] sq:focus-visible:ring-0 sq:focus-visible:after:absolute sq:focus-visible:after:-left-[--offset] sq:focus-visible:after:-top-[--offset] sq:focus-visible:after:size-[calc(100%+2*var(--offset))]',
        ),
        secondary:
          'bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80',
        ghost: cn(
          'hover:bg-accent hover:text-accent-foreground',
          'sq-radius-[--sq-r] hover:squircle hover:sq-fill-[hsl(var(--accent))]',
          'relative focus-visible:after:squircle focus-visible:after:sq-radius-[calc(var(--sq-r)+var(--offset))] focus-visible:after:sq-outline focus-visible:after:sq-stroke-[hsl(var(--ring))] sq:focus-visible:ring-0 sq:focus-visible:after:absolute sq:focus-visible:after:-left-[--offset] sq:focus-visible:after:-top-[--offset] sq:focus-visible:after:size-[calc(100%+2*var(--offset))]',
        ),
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-10 rounded-md px-8',
        icon: 'size-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

export interface ButtonProps extends
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  React.RefAttributes<HTMLButtonElement>,
  VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

function Button({
  className,
  variant,
  size,
  asChild = false,
  ref,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : 'button'
  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props}
    />
  )
}
Button.displayName = 'Button'

export { Button, buttonVariants }
