import type { LearningPhase, TrieWordLabel, VocabState, WordLocator } from '@/lib/LabeledTire.ts'

import {
  LEARNING_PHASE,
} from '@/lib/LabeledTire.ts'

export type LabelData = {
  vocab: VocabState
  wFamily: string[]
}

export type LabelSourceData = LabelData & {
  locations: WordLocator[]
}

export type LabelDisplayTable = LabelData & InertialPhase

export type LabelDisplaySource = LabelSourceData & InertialPhase

export type InertialPhase = {
  inertialPhase: LearningPhase
}

export function formVocab(lemma: TrieWordLabel) {
  let locations = [...lemma.src]
  const wFamily = [lemma.path]

  if (lemma.derive?.length) {
    function collectNestedSource(lexicalEntries: TrieWordLabel[]) {
      for (const lexicalEntry of lexicalEntries) {
        if (lexicalEntry.src[0]) {
          wFamily.push(lexicalEntry.path)
          if (locations[0]) {
            locations = lexicalEntry.src[0].wordOrder < locations[0].wordOrder
              ? lexicalEntry.src.concat(locations)
              : locations.concat(lexicalEntry.src)
          }
          else {
            locations = lexicalEntry.src
          }
        }

        if (lexicalEntry.derive?.length)
          collectNestedSource(lexicalEntry.derive)
      }
    }

    collectNestedSource(lemma.derive)
  }

  const vocab: VocabState = {
    word: lemma.path,
    learningPhase: LEARNING_PHASE.NEW,
    isUser: false,
    original: false,
    timeModified: null,
    rank: null,
    ...lemma.vocab,
  }

  const labelDisplaySource: LabelSourceData = {
    vocab,
    wFamily,
    locations,
  }

  return labelDisplaySource
}
