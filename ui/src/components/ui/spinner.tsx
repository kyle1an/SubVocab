// https://github.com/shadcn-ui/ui/discussions/1694#discussioncomment-11729367
import type { VariantProps } from 'class-variance-authority'

import { cva } from 'class-variance-authority'
import * as React from 'react'

import { cn } from '@/lib/utils'

const spinnerVariants = cva(
  'relative inline-block aspect-square',
  {
    variants: {
      variant: {
        default: '[&>div]:bg-foreground',
        primary: '[&>div]:bg-primary',
        secondary: '[&>div]:bg-secondary',
        destructive: '[&>div]:bg-destructive',
        muted: '[&>div]:bg-muted-foreground',
      },
      size: {
        sm: 'size-4',
        default: 'size-5',
        lg: 'size-8',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
)

export interface SpinnerProps
  extends React.HTMLAttributes<HTMLDivElement>,
  Omit<VariantProps<typeof spinnerVariants>, 'size'> {
  className?: string
  size?: VariantProps<typeof spinnerVariants>['size'] | number
}

const Spinner = ({ className, variant, size = 'default' }: SpinnerProps) => (
  <div
    role="status"
    aria-label="Loading"
    className={cn(
      typeof size === 'string'
        ? spinnerVariants({ variant, size })
        : spinnerVariants({ variant }),
      className,
    )}
    style={typeof size === 'number' ? { width: size, height: size } : undefined}
  >
    {Array.from({ length: 8 }).map((_, i) => (
      <div
        // eslint-disable-next-line react/no-array-index-key
        key={i}
        className="absolute left-[46.5%] top-[4.4%] h-[28%] w-[9%] origin-[center_170%] animate-spinner rounded-full opacity-10 will-change-transform"
        style={{
          transform: `rotate(${i * (360 / 8)}deg)`,
          animationDelay: `${(i * (1 / 8))}s`,
        }}
        aria-hidden="true"
      />
    ))}
    <span className="sr-only">Loading...</span>
  </div>
)

export { Spinner }
