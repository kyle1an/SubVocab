import { useMediaQuery } from 'foxact/use-media-query'
import { Link, Outlet } from 'react-router'

import type { LabelDisplaySource } from '@/lib/vocab'

import {
  baseVocabAtom,
  useIrregularMapsQuery,
} from '@/api/vocab-api'
import { FileInput } from '@/components/file-input'
import { VocabSourceTable } from '@/components/VocabSource'
import { LabeledTire, LEARNING_PHASE } from '@/lib/LabeledTire'
import {
  formVocab,
} from '@/lib/vocab'
import { statusRetainedList } from '@/lib/vocab-utils'
import { fileTypesAtom, isSourceTextStaleAtom, sourceTextAtom } from '@/store/useVocab'

import { FileSettings } from './file-settings'

const fileInfoAtom = atom('')
const textCountAtom = atom(0)
const acquaintedWordCountAtom = atom(0)
const newWordCountAtom = atom(0)

function SourceVocab({
  text: { text: sourceText },
}: {
  text: { text: string }
}) {
  const { data: irregulars = [] } = useIrregularMapsQuery()
  const [baseVocab] = useAtom(baseVocabAtom)
  const [rows, setRows] = useState<LabelDisplaySource[]>([])
  const [sentences, setSentences] = useState<string[]>([])
  const setCount = useSetAtom(textCountAtom)
  const setNewCount = useSetAtom(newWordCountAtom)
  const setAcquaintedCount = useSetAtom(acquaintedWordCountAtom)

  useEffect(() => {
    const trie = new LabeledTire()
    trie.add(sourceText)
    trie.mergeDerivedWordIntoStem(irregulars)
    trie.mergedVocabulary(baseVocab)
    const list = trie.getVocabulary()
      .map(formVocab)
      .filter((v) => v.locations.length >= 1)
      .sort((a, b) => (a.locations[0]?.wordOrder ?? 0) - (b.locations[0]?.wordOrder ?? 0))
    setRows((r) => statusRetainedList(r, list))
    setSentences(trie.sentences)
    let acquaintedCount = 0
    let newCount = 0
    let rest = 0
    for (const item of list) {
      if (item.vocab.learningPhase === LEARNING_PHASE.ACQUAINTED)
        acquaintedCount += item.locations.length
      else if (item.vocab.learningPhase === LEARNING_PHASE.NEW)
        newCount += item.locations.length
      else
        rest += item.locations.length
    }
    setAcquaintedCount(acquaintedCount)
    setNewCount(newCount)
    setCount(acquaintedCount + newCount + rest)
  }, [sourceText, baseVocab, irregulars, setCount, setAcquaintedCount, setNewCount])

  function handlePurge() {
    setRows(produce((draft) => {
      draft.forEach((todo) => {
        if (todo.inertialPhase !== todo.vocab.learningPhase)
          todo.inertialPhase = todo.vocab.learningPhase
      })
    }))
  }

  return (
    <VocabSourceTable
      data={rows}
      sentences={sentences}
      onPurge={handlePurge}
      className="h-full"
    />
  )
}

export function Home() {
  const { t } = useTranslation()
  const setFileInfo = useSetAtom(fileInfoAtom)
  const setSourceText = useSetAtom(sourceTextAtom)

  function handleFileChange({ name, value }: { name: string, value: string }) {
    setFileInfo(name)
    setSourceText((v) => ({
      text: value,
      version: v.version++,
    }))
  }

  return (
    <main className="m-auto h-[calc(100svh-4px*11)] w-full max-w-screen-xl px-5 pb-7">
      <div className="relative flex h-14 items-center gap-2">
        <FileInput
          onFileSelect={handleFileChange}
        >
          {t('browseFiles')}
        </FileInput>
        <FileSettings />
        <Button
          variant="outline"
          className="whitespace-nowrap p-0"
          size="sm"
        >
          <Link
            to="/subtitles"
            className="flex size-full items-center px-3"
          >
            Subtitles
          </Link>
        </Button>
        <div className="grow" />
      </div>
      <Outlet />
    </main>
  )
}

export function ResizeVocabularyPanel() {
  const { t } = useTranslation()
  const [fileInfo, setFileInfo] = useAtom(fileInfoAtom)
  const [sourceText, setSourceText] = useAtom(sourceTextAtom)
  const deferredSourceText = useDeferredValue(sourceText)
  const [isSourceTextStale, setIsSourceTextStale] = useAtom(isSourceTextStaleAtom)
  useEffect(() => {
    const isStale = sourceText.version !== deferredSourceText.version
    if (isSourceTextStale !== isStale)
      setIsSourceTextStale(isStale)
  })

  function handleTextareaChange({ name, value }: { name?: string, value: string }) {
    setSourceText((v) => ({
      text: value,
      version: v.version++,
    }))
    if (name)
      setFileInfo(name)
  }

  const [count] = useAtom(textCountAtom)
  const [acquaintedWordCount] = useAtom(acquaintedWordCountAtom)
  const [newWordCount] = useAtom(newWordCountAtom)
  const isMdScreen = useMediaQuery('(min-width: 768px)')
  const direction = isMdScreen ? 'horizontal' : 'vertical'
  let defaultSizes = [50, 50]
  if (direction === 'vertical') {
    defaultSizes = [
      36,
      64,
    ]
  }
  const [fileTypes] = useAtom(fileTypesAtom)

  return (
    (
      <SquircleBg className="flex h-[calc(100%-4px*14)] items-center justify-center overflow-hidden rounded-xl border">
        <SquircleMask asChild>
          <ResizablePanelGroup
            direction={direction}
            className={cn(
              'iOS:[body:has(&)]:overflow-hidden', // prevent overscroll
            )}
          >
            <ResizablePanel defaultSize={defaultSizes[0]}>
              <div className="flex h-full items-center justify-center">
                <div className="relative flex h-full grow flex-col overflow-hidden">
                  <div className="flex h-12 shrink-0 items-center bg-background py-2 pl-4 pr-2 text-xs">
                    <span className="grow truncate">{fileInfo}</span>
                  </div>
                  <div className="z-10 h-px w-full border-b border-solid border-border shadow-[0_0.4px_2px_0_rgb(0_0_0/0.05)]" />
                  <div className="size-full grow text-base text-zinc-700 md:text-sm">
                    <TextareaInput
                      value={sourceText.text}
                      placeholder={t('inputArea')}
                      fileTypes={fileTypes}
                      onChange={handleTextareaChange}
                    />
                  </div>
                  <div className="flex w-full justify-center border-t border-solid border-t-zinc-200 bg-background dark:border-slate-800">
                    <VocabStatics
                      rowsCountFiltered={count}
                      text={` ${t('words')}`}
                      rowsCountNew={newWordCount}
                      rowsCountAcquainted={acquaintedWordCount}
                      progress
                    />
                  </div>
                </div>
              </div>
            </ResizablePanel>
            <ResizableHandle
              withHandle
              className="focus-visible:bg-ring focus-visible:ring-offset-[-1px]"
            />
            <ResizablePanel defaultSize={defaultSizes[1]}>
              <SourceVocab
                text={deferredSourceText}
              />
            </ResizablePanel>
          </ResizablePanelGroup>
        </SquircleMask>
      </SquircleBg>
    )
  )
}
