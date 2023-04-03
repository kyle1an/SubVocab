import { defineComponent, ref, watch } from 'vue'
import { t } from '@/i18n'
import { VocabSourceTable } from '@/components/vocabulary/VocabSource'
import { FileInput } from '@/components/FileInput'
import type { LabelSubDisplay, SrcRow } from '@/types'
import { useVocabStore } from '@/store/useVocab'
import { createSignal, useDebounceTimeout } from '@/composables/utilities'
import { generatedVocabTrie } from '@/utils/vocab'
import { TextareaInput } from '@/components/TextareaInput'

export const Import = defineComponent({
  setup() {
    const [fileInfo, setFileInfo] = createSignal('')

    function onFileChange({ name, value }: { name: string, value: string }) {
      setFileInfo(name)
      setInputText(value)
    }

    function onTextChange({ name, value }: { name?: string, value: string }) {
      setInputText(value)
      if (name) setFileInfo(name)
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      // eslint-disable-next-line
      importFileInput.value?.inputChanged()
    }

    const [count, setCount] = createSignal(0)
    const store = useVocabStore()
    const [inputText, setInputText] = createSignal('')
    watch([inputText, () => store.baseVocab, () => store.irregularMaps], useDebounceTimeout(function refreshVocab() {
      const { list, count } = generatedVocabTrie(inputText())
      setCount(count)
      setTableDataOfVocab(list)
    }, 50))
    const [tableDataOfVocab, setTableDataOfVocab] = createSignal<SrcRow<LabelSubDisplay>[]>([])
    const importFileInput = ref<InstanceType<typeof FileInput> | null>(null)
    return () => (
      <div class="w-full max-w-screen-xl">
        <FileInput
          ref={importFileInput}
          class="relative mx-3 flex h-14 items-center xl:mx-0"
          onFileInput={onFileChange}
        >
          {t('browseVocabFile')}
        </FileInput>
        <div class="flex flex-col gap-6 md:h-[calc(100vh-140px)] md:flex-row">
          <div class="relative box-border flex flex-1 basis-auto flex-col overflow-hidden border md:rounded-[12px] md:shadow-sm">
            <div class="flex h-10 shrink-0 items-center border-b bg-zinc-50 py-2 pl-4 pr-2 font-compact text-xs text-neutral-600">
              <span class="grow truncate">
                {`${fileInfo()} `}
              </span>
            </div>
            <div class="h-full w-full grow border-b text-base text-zinc-700 md:text-sm">
              <TextareaInput
                value={inputText()}
                placeholder={t('inputArea')}
                onTextChange={onTextChange}
              />
            </div>
            <div class="flex h-9 shrink-0 items-center bg-zinc-50 p-1.5 font-compact text-xs text-neutral-600">
              <span class="grow truncate" />
              <span class="shrink-0 text-right tabular-nums">
                {` ${count().toLocaleString('en-US')} ${t('words')}`}
              </span>
              <span class="mx-1 inline-block h-[18px] w-px border-l align-middle" />
              <button
                class="box-border inline-flex h-7 max-h-full grow-0 cursor-pointer items-center justify-center whitespace-nowrap rounded-md bg-zinc-200 px-3 py-2.5 text-center align-middle text-sm leading-3 transition-colors hover:bg-yellow-300"
                onClick={() => store.acquaintEveryVocab(tableDataOfVocab())}
              >
                {t('acquaintedAll')}
              </button>
            </div>
          </div>
          <div class="h-[86vh] overflow-visible pb-6 md:mt-0 md:h-full md:w-[44%] md:pb-0">
            <VocabSourceTable
              data={tableDataOfVocab()}
              tableName={'vocab-import'}
            />
          </div>
        </div>
      </div>
    )
  }
})
