import type { LabelBase, LabelSieveDisplay, LabelVocab } from '@/types'

type Char = `'` | '’' | '-' | 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h' | 'i' | 'j' | 'k' | 'l' | 'm' | 'n' | 'o' | 'p' | 'q' | 'r' | 's' | 't' | 'u' | 'v' | 'w' | 'x' | 'y' | 'z';

type TrieNode<T extends LabelBase> = {
  [K in Char | '$']?: K extends Char ? TrieNode<T>
    : K extends '$' ? T
      : never
}

function caseOr(a: string, b: string) {
  const r = []

  for (let i = 0; i < a.length; i++) {
    r.push(a.charCodeAt(i) | b.charCodeAt(i))
  }

  return String.fromCharCode(...r)
}

const hasUppercase = (chars: string) => /[A-ZÀ-Þ]/.test(chars)
const isVowel = (chars: string) => ['a', 'e', 'i', 'o', 'u'].includes(chars)

export default class LabeledTire {
  root: TrieNode<LabelVocab>
  #sequence = 0
  sentences: string[] = []
  wordCount = 0
  vocabulary: Array<LabelVocab | null> = []

  constructor(baseTrie: TrieNode<LabelVocab> = {}) {
    this.root = baseTrie
    return this
  }

  getNode(word: string) {
    let node = this.root
    for (const c of word.split('')) {
      node = node[c as Char] ??= {}
    }

    return node
  }

  #withPaths(vocab: LabelSieveDisplay[]) {
    for (const sieve of vocab) {
      this.#createPath(sieve)
    }

    return this
  }

  #createPath(sieve: LabelSieveDisplay) {
    const sieveWord = sieve.w
    const hasUp = hasUppercase(sieveWord)
    const node = this.getNode(hasUp ? sieveWord.toLowerCase() : sieveWord)
    const $ = node.$

    if (!$) {
      node.$ = {
        w: sieveWord,
        up: hasUp,
        src: [],
        vocab: sieve,
      }
    } else {
      if ($.vocab) {
        $.vocab.acquainted = sieve.acquainted
        $.vocab.inStore = sieve.inStore
        $.vocab.time_modified = sieve.time_modified
        $.vocab.rank = sieve.rank
        $.wFamily = [$.vocab.w, sieve.w]
      } else {
        $.vocab = sieve
      }
      if ($.up) {
        if (hasUp) {
          if ($.vocab.rank) {
            if (sieve.rank && sieve.rank < $.vocab.rank) {
              $.vocab = sieve
            }
          } else if (sieve.rank) {
            $.vocab = sieve
          }
        } else {
          $.w = sieveWord
          $.up = false
          $.vocab = sieve
        }
      }
    }
  }

  mergeDerivedWordIntoStem(irregularMaps: string[][]) {
    for (const irregulars of irregularMaps) {
      const stem = irregulars[0]
      const hasUp = hasUppercase(stem)
      const stemNode = this.getNode(hasUp ? stem.toLowerCase() : stem)

      stemNode.$ ??= {
        w: stem,
        up: hasUp,
        src: [],
        vocab: {
          w: stem,
          acquainted: false,
          is_user: 0,
          inUpdating: false,
          inStore: false,
          original: true,
          rank: null,
          time_modified: null,
        }
      }
      let i = irregulars.length
      while (--i) {
        const derive = this.getNode(irregulars[i]).$
        if (derive
          && derive.src.length
          && !derive.variant
        ) {
          this.#mergeTo(stemNode.$, derive)
        }
      }
    }

    return this
  }

  add(input: string) {
    let previousSize = this.sentences.length
    this.sentences = this.sentences.concat(input.match(/["'@A-Za-zÀ-ÿ](?:[^<>{};.?!]*(?:<[^>]*>|{[^}]*})*[ \n\r]?(?:[-.](?=[A-Za-zÀ-ÿ])|\.{3} *)*["'@A-Za-zÀ-ÿ])+[^<>(){} \r\n]*/mg) || [])
    const totalSize = this.sentences.length

    for (; previousSize < totalSize; ++previousSize) {
      for (const m of this.sentences[previousSize].matchAll(/(?:[A-Za-zÀ-ÿ]['-]?)*(?:[A-ZÀ-Þa-zß-ÿ]+[a-zß-ÿ]*)+(?:['’-]?[A-Za-zÀ-ÿ]'?)+/mg)) {
        const matchedWord = m[0]
        ++this.wordCount
        if (m.index === undefined) continue
        this.#update(matchedWord, hasUppercase(matchedWord), m.index, previousSize)
      }
    }

    return this
  }

  #update(original: string, hasUp: boolean, index: number, currentSentenceIndex: number) {
    const branch = this.getNode(hasUp ? original.toLowerCase() : original)
    const $ = branch.$

    if (!$) {
      branch.$ = {
        w: original,
        up: hasUp,
        src: [{
          sentenceId: currentSentenceIndex,
          startIndex: index,
          wordLength: original.length,
          wordSequence: ++this.#sequence,
        }]
      }
      this.vocabulary[branch.$.src[0].wordSequence] = branch.$
    } else {
      $.src.push(
        {
          sentenceId: currentSentenceIndex,
          startIndex: index,
          wordLength: original.length,
          wordSequence: $.src.length ? this.#sequence : ++this.#sequence,
        }
      )

      if ($.src.length === 1) {
        this.vocabulary[$.src[0].wordSequence] = $
      }

      if ($.up && !$.vocab) {
        if (hasUp) {
          $.w = caseOr($.w, original)
          $.up = hasUppercase($.w)
        } else {
          $.w = original
          $.up = false
        }
      }
    }
  }

  mergedVocabulary(baseVocab: LabelSieveDisplay[]) {
    this.#withPaths(baseVocab)
      .#traverseMerge(this.root)
    return this
  }

  #traverseMerge(layer: TrieNode<LabelVocab>) {
    for (const k in layer) {
      const key = k as keyof typeof layer
      if (key === '$') continue
      const innerLayer = layer[key] ?? {}
      // deep first traverse eg: beings(being) vs bee
      this.#traverseMerge(innerLayer)
      this.#mergeVocabOfDifferentSuffixes(innerLayer, key, layer)
    }
  }

  #mergeVocabOfDifferentSuffixes(curr: TrieNode<LabelVocab>, previousChar: Char, parentLayer: TrieNode<LabelVocab>) {
    const isPreviousCharS = previousChar === 's'
    const curr_$ = curr.$
    const curr_e$ = curr.e?.$
    const curr_s$ = isPreviousCharS ? undefined : curr.s?.$
    const isTheLastCharConsonant = !isVowel(previousChar)
    const curr_in = curr.i?.n
    const curr_ing = curr_in?.g
    const curr_ing$ = curr_ing?.$
    const curr_ying$ = isTheLastCharConsonant ? curr.y?.i?.n?.g?.$ : undefined

    function suffixLabels(curr: TrieNode<LabelVocab>) {
      const labels = [
        curr.e?.s?.$,
        curr.e?.s?.[`'`]?.$,
        curr.e?.d?.$
      ]

      if (curr_in) {
        labels.push(
          curr_in[`'`]?.$,
          curr_in[`’`]?.$,
        )
        if (curr_ing) {
          labels.push(
            curr_ing$,
            curr_ing.s?.$,
          )
        }
      }

      return labels
    }

    const aposSuffixLabels = (curr_apos: TrieNode<LabelVocab>) => [
      curr_apos.s?.$,
      curr_apos.l?.l?.$,
      curr_apos.v?.e?.$,
      curr_apos.d?.$,
    ]

    if (curr_ing$) {
      this.#batchMergeTo(curr_ing$, [
        curr_in?.[`'`]?.$,
        curr_in?.[`’`]?.$,
      ])
    }

    if (curr_$) {
      this.#batchMergeTo(curr_e$ || curr_$, suffixLabels(curr))
      const toBeMerged = [
        curr_s$,
        curr.e?.r?.$,
        curr.e?.s?.t?.$,
        curr.l?.y?.$,
        curr.l?.e?.s?.s?.$,
        curr.n?.e?.s?.s?.$,
      ]

      if (previousChar === 'e') {
        toBeMerged.push(
          parentLayer.d?.e?.n?.$,
        )
      } else if (isTheLastCharConsonant) {
        const wordEndsWithVowelAndConsonant = isVowel(curr_$.w.slice(-2, -1))
        if (wordEndsWithVowelAndConsonant) {
          toBeMerged.push(
            curr[previousChar]?.i?.n?.g?.$,
            curr[previousChar]?.i?.n?.[`'`]?.$,
            curr[previousChar]?.i?.n?.[`’`]?.$,
            curr[previousChar]?.e?.d?.$,
          )
        } else {
          const wordEndsWithConsonantAndConsonantY = previousChar === 'y'
          if (wordEndsWithConsonantAndConsonantY) {
            toBeMerged.push(
              parentLayer.i?.e?.s?.$,
              parentLayer.i?.e?.s?.[`'`]?.$,
              parentLayer.i?.e?.d?.$,
              parentLayer.i?.e?.r?.$,
              parentLayer.i?.e?.s?.t?.$,
              parentLayer.i?.l?.y?.$,
            )
          }
        }
      }

      if (!isPreviousCharS) {
        toBeMerged.push(
          curr.s?.[`'`]?.$,
          curr.s?.[`’`]?.$,
        )
      }
      this.#batchMergeTo(curr_$, toBeMerged)
      if (curr[`'`]) this.#batchMergeTo(curr_$, aposSuffixLabels(curr[`'`]))
      if (curr[`’`]) this.#batchMergeTo(curr_$, aposSuffixLabels(curr[`’`]))
    } else if (curr_e$) {
      this.#batchMergeTo(curr_e$, suffixLabels(curr))
    } else if (curr_s$) {
      const original = curr_s$.w.slice(0, -1)
      const $ = { w: curr_s$.w.slice(0, -1), src: [], up: hasUppercase(original), derive: [] }
      this.#batchMergeTo($, suffixLabels(curr))

      if (curr[`'`]) this.#batchMergeTo($, aposSuffixLabels(curr[`'`]))
      if (curr[`’`]) this.#batchMergeTo($, aposSuffixLabels(curr[`’`]))

      if ($.derive.length) {
        this.#mergeNodes($, curr_s$)
        curr.$ = $
        this.vocabulary.push($)
      }
    } else if (curr_ying$) {
      const original = curr_ying$.w.slice(0, -3)
      const $ = { w: original, src: [], up: hasUppercase(original), derive: [] }
      this.#batchMergeTo($, [
        curr.i?.e?.s?.$,
        curr.i?.e?.d?.$,
      ])

      if ($.derive.length) {
        this.#mergeNodes($, curr_ying$)
        curr.y ??= {}
        curr.y.$ = $
        this.vocabulary.push($)
      }
    }
  }

  #batchMergeTo($: LabelVocab, next_$$: Array<LabelVocab | undefined>) {
    for (const next_$ of next_$$) {
      if (next_$) {
        this.#mergeNodes($, next_$)
      }
    }
  }

  #mergeNodes(targetWord: LabelVocab, latterWord: LabelVocab) {
    if (latterWord.vocab?.original
      || latterWord.variant
    ) return

    this.#mergeTo(targetWord, latterWord)
  }

  #mergeTo(targetWord: LabelVocab, latterWord: LabelVocab) {
    if (!targetWord.derive) {
      targetWord.derive = []

      if (!targetWord.src.length) {
        if (latterWord.src.length) {
          this.vocabulary[latterWord.src[0].wordSequence] = targetWord
        }
      }
    }

    targetWord.derive.push(latterWord)
    latterWord.variant = true
  }
}
