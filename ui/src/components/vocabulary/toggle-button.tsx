import type { VocabState } from '@/lib/LabeledTire.ts'

import { LEARNING_PHASE } from '@/lib/LabeledTire.ts'

export function VocabToggle<T extends VocabState>({
  vocab,
  onToggle,
  className = '',
}: {
  vocab: T
  onToggle: (arg: T) => void
  className?: string
}) {
  const phase = vocab.learningPhase
  const {
    NEW,
    RETAINING,
    ACQUAINTED,
    FADING,
  } = LEARNING_PHASE
  return (
    <div className={cn('flex w-[calc(28px+.1px)] justify-center', className)}>
      <button
        type="button"
        aria-label="Toggle vocabulary state"
        disabled={phase === RETAINING || phase === FADING}
        className={cn(
          'group/tgl inline-flex size-6 max-h-full grow-0 items-center justify-center whitespace-nowrap rounded-full border p-[5px] text-center align-middle text-xs/3 transition-colors [&:not(:disabled)]:cursor-pointer [&:not(:disabled)]:active:scale-95',
          phase === NEW && 'border-zinc-300 bg-transparent text-transparent dark:border-zinc-600',
          phase === RETAINING && 'border-zinc-200/80 bg-amber-300/60 text-white duration-300 dark:border-zinc-600 dark:bg-amber-300/60 dark:text-black/60',
          phase === ACQUAINTED && 'border-amber-300 bg-amber-300 text-transparent hover:bg-amber-300/80 dark:hover:bg-amber-300/80',
          phase === FADING && 'border-amber-300/80 bg-amber-300/15 text-amber-400 dark:border-amber-300/60 dark:bg-amber-300/10 dark:text-amber-300/60',
          className,
        )}
        onClick={() => {
          onToggle(vocab)
        }}
      >
        <IconLucideLoader
          className={cn(
            'inline-flex w-full animate-spin items-center justify-center transition-colors duration-1000 [animation-duration:2s]',
            (phase === RETAINING || phase === FADING) ? '' : 'hidden',
          )}
        />
        <IconLucideCheck
          className={cn(
            'inline-flex w-full items-center justify-center',
            (phase === NEW || phase === ACQUAINTED) ? '' : 'hidden',
            phase === NEW && 'text-transparent transition-colors duration-200 group-hover/tgl:text-black dark:group-hover/tgl:text-zinc-400',
            phase === ACQUAINTED && 'text-white dark:text-black',
          )}
        />
      </button>
    </div>
  )
}
