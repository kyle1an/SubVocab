import 'chart.js/auto'

import type { ChartData, ChartOptions } from 'chart.js'

import {
  Chart as ChartJS,
} from 'chart.js'
import { merge, rangeRight } from 'lodash-es'
import { Bar } from 'react-chartjs-2'
import { useSessionStorage } from 'react-use'
import colors from 'tailwindcss/colors'

import type { VocabState } from '@/lib/LabeledTire'

import { baseVocabAtom } from '@/api/vocab-api'
import { LEARNING_PHASE } from '@/lib/LabeledTire'

type DataSet = {
  groupName: string
  groupKey: string
  tooltipFooter: string
  range: [Date, Date]
  groupValue: VocabState[]
}

function mapWeek(userWords: VocabState[]) {
  const today = new Date()
  const preset: Record<string, VocabState[]> = {}
  const dataPreset: DataSet[] = []
  const getGroupKey = (date: Date) => date.toDateString()
  rangeRight(0, 7).forEach((i) => {
    const subDay = subDays(today, i)
    const groupName = format(subDay, 'EEE')
    const groupKey = getGroupKey(subDay)
    const groupValue: VocabState[] = []
    dataPreset.push({
      groupName,
      tooltipFooter: format(subDay, 'LLL d, yyyy'),
      groupKey,
      range: [subDay, subDay],
      groupValue,
    })
    preset[groupKey] = groupValue
  })

  userWords.forEach((v) => {
    if (v.learningPhase === LEARNING_PHASE.ACQUAINTED && v.timeModified) {
      const label = getGroupKey(new Date(v.timeModified))
      const group = preset[label]
      if (group)
        group.push(v)
    }
  })

  return dataPreset
}

function mapMonth(userWords: VocabState[]) {
  const today = new Date()
  const preset: Record<string, VocabState[]> = {}
  const dataPreset: DataSet[] = []
  const getGroupKey = (date: Date) => date.toDateString()
  rangeRight(0, 31).forEach((i) => {
    const subDay = subDays(today, i)
    let groupName = ''
    if (isSunday(subDay))
      groupName = format(subDay, 'd')

    const groupKey = getGroupKey(subDay)
    const groupValue: VocabState[] = []
    dataPreset.push({
      groupName,
      tooltipFooter: '',
      groupKey,
      range: [subDay, subDay],
      groupValue,
    })
    preset[groupKey] = groupValue
  })

  userWords.forEach((v) => {
    if (v.learningPhase === LEARNING_PHASE.ACQUAINTED && v.timeModified) {
      const label = getGroupKey(new Date(v.timeModified))
      const group = preset[label]
      if (group)
        group.push(v)
    }
  })

  return dataPreset
}

function map6M(userWords: VocabState[]) {
  const today = new Date()
  const preset: Record<string, VocabState[]> = {}
  const dataPreset: DataSet[] = []
  const getGroupKey = (date: Date) => format(date, 'w, yyyy')
  rangeRight(0, 25).forEach((i) => {
    const subWeek = subWeeks(today, i)
    let groupName = ''
    const weekStart = startOfWeek(subWeek)
    const weekEnd = endOfWeek(subWeek)
    const monthStart = startOfMonth(weekEnd)
    if (monthStart >= weekStart && monthStart <= weekEnd)
      groupName = format(weekEnd, 'MMM')

    const groupKey = getGroupKey(subWeek)
    const groupValue: VocabState[] = []
    dataPreset.push({
      groupName,
      groupKey,
      tooltipFooter: `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d')}, ${format(subWeek, 'yyyy')}`,
      range: [weekStart, weekEnd],
      groupValue,
    })
    preset[groupKey] = groupValue
  })

  userWords.forEach((v) => {
    if (v.learningPhase === LEARNING_PHASE.ACQUAINTED && v.timeModified) {
      const label = getGroupKey(new Date(v.timeModified))
      const group = preset[label]
      if (group)
        group.push(v)
    }
  })

  return dataPreset
}

function mapY(userWords: VocabState[]) {
  const today = new Date()
  const preset: Record<string, VocabState[]> = {}
  const dataPreset: DataSet[] = []
  const getGroupKey = (date: Date) => format(date, 'LLL')
  rangeRight(0, 12).forEach((i) => {
    const subMonth = subMonths(today, i)
    const groupName = format(subMonth, 'LLLLL')

    const groupKey = getGroupKey(subMonth)
    const groupValue: VocabState[] = []
    dataPreset.push({
      groupName,
      groupKey,
      tooltipFooter: format(subMonth, 'MMM yyyy'),
      range: [subMonth, subMonth],
      groupValue,
    })
    preset[groupKey] = groupValue
  })

  userWords.forEach((v) => {
    if (v.learningPhase === LEARNING_PHASE.ACQUAINTED && v.timeModified) {
      const label = getGroupKey(new Date(v.timeModified))
      const group = preset[label]
      if (group)
        group.push(v)
    }
  })

  return dataPreset
}

const SEGMENT_NAME = 'prev-chart-select'
export function Chart() {
  const { t } = useTranslation()
  const [userWords] = useAtom(baseVocabAtom)

  const segments = [
    { value: 'W', label: t('W') },
    { value: 'M', label: t('M') },
    { value: '6M', label: t('6M') },
    { value: 'Y', label: t('Y') },
  ] as const
  type Segment = typeof segments[number]['value']
  const [segment, setSegment] = useSessionStorage<Segment>(`${SEGMENT_NAME}-value`, 'W')

  ChartJS.defaults.font.family = [
    ...(navigator.userAgent.includes('Safari') && !navigator.userAgent.includes('Chrome') ? [] : ['SF Pro Rounded']),
    ...['SF Pro Text', '-apple-system', 'Inter', 'system-ui', 'sans-serif'],
  ].join(', ')
  ChartJS.defaults.font.weight = 500

  let groupedRows: DataSet[] = []
  if (segment === 'W')
    groupedRows = mapWeek(userWords)
  else if (segment === 'M')
    groupedRows = mapMonth(userWords)
  else if (segment === '6M')
    groupedRows = map6M(userWords)
  else if (segment === 'Y')
    groupedRows = mapY(userWords)

  const barColor = colors.red[400]

  let data = groupedRows.map((v) => v.groupValue.length)
  if (segment === '6M') {
    data = data.map((v) => {
      const daily = v / 7
      return daily
    })
  }

  const chartData = {
    labels: groupedRows.map((v) => v.groupName),
    datasets: [
      {
        borderRadius: {
          topRight: 3,
          topLeft: 3,
        },
        label: 'Acquainted Vocabulary',
        data,
        backgroundColor: barColor,
      },
    ],
  } satisfies ChartData<'bar', number[], string>

  const sharedOptions = {
    interaction: {
      intersect: false,
      mode: 'index',
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        displayColors: false,
        yAlign: 'bottom',
        callbacks: {
          title() {
            return 'TOTAL'
          },
          label(context) {
            const value = context.parsed.y || 0
            return `${value} Vocabulary`
          },
        },
      },
    },
    scales: {
      x: {
        border: {
          dash(scaleContext) {
            const label = scaleContext?.tick?.label
            if (label === '1' || label === 'Sun')
              return [0, 0]

            return [2, 2]
          },
        },
        ticks: {
          maxRotation: 0,
          autoSkip: false,
        },
      },
      y: {
        position: 'right',
        ticks: {
          precision: 0,
        },
        border: {
          display: false,
        },
      },
    },
    layout: {
      padding: {
        left: 24,
      },
    },
  } satisfies ChartOptions<'bar'>
  let segmentOptions: ChartOptions<'bar'> = {}

  if (segment === 'W') {
    segmentOptions = {
      plugins: {
        tooltip: {
          callbacks: {
            footer(context) {
              if (context[0]) {
                const { dataIndex } = context[0]
                const bar = groupedRows[dataIndex]
                if (bar)
                  return bar.tooltipFooter
              }
            },
          },
        },
      },
    }
  }
  else if (segment === 'M') {
    segmentOptions = {
      plugins: {
        tooltip: {
          callbacks: {
            footer(context) {
              if (context[0]) {
                const { dataIndex } = context[0]
                const bar = groupedRows[dataIndex]
                if (bar)
                  return format(new Date(bar.groupKey), 'MMM d, yyyy')
              }
            },
          },
        },
      },
      scales: {
        x: {
          border: {
            dash(scaleContext) {
              const { index: dataIndex } = scaleContext
              const bar = groupedRows[dataIndex]
              const groupDate = new Date(bar?.range[0] ?? '')
              if (isFirstDayOfMonth(groupDate))
                return [0, 0]

              if (bar) {
                if (isSunday(new Date(bar.groupKey)))
                  return [2, 2]
              }
              return [0, 1] // hide
            },
          },
        },
      },
    }
  }
  else if (segment === '6M') {
    segmentOptions = {
      plugins: {
        tooltip: {
          callbacks: {
            title() {
              return 'DAILY AVERAGE'
            },
            label(context) {
              const value = context.parsed.y || 0
              return `${value.toLocaleString('en-US', { maximumFractionDigits: 1, minimumFractionDigits: 0 })} Vocabulary`
            },
            footer(context) {
              if (context[0]) {
                const { dataIndex } = context[0]
                const bar = groupedRows[dataIndex]
                if (bar)
                  return bar.tooltipFooter
              }
            },
          },
        },
      },
      scales: {
        x: {
          border: {
            dash(scaleContext) {
              const { index: dataIndex } = scaleContext
              const bar = groupedRows[dataIndex]
              if (bar?.groupName)
                return [2, 2]

              return [0, 1]
            },
          },
        },
      },
    }
  }
  else if (segment === 'Y') {
    segmentOptions = {
      plugins: {
        tooltip: {
          callbacks: {
            footer(context) {
              if (context[0]) {
                const { dataIndex } = context[0]
                const bar = groupedRows[dataIndex]
                if (bar)
                  return bar.tooltipFooter
              }
            },
          },
        },
      },
      scales: {
        x: {
          border: {
            dash(scaleContext) {
              const { index: dataIndex } = scaleContext
              const bar = groupedRows[dataIndex]
              const groupDate = new Date(bar?.range[0] ?? '')
              if (getMonth(groupDate) === 0)
                return [0, 0]

              return [2, 2]
            },
          },
        },
      },
    }
  }
  const options = merge(sharedOptions, segmentOptions)

  return (
    <div>
      <div className="flex h-14">
        <div className="flex flex-auto grow items-center justify-center font-bold text-neutral-700 dark:text-stone-300">
          Acquainted Vocabulary
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <SegmentedControl
          segments={segments}
          value={segment}
          onChoose={setSegment}
        />
        <Bar
          options={options}
          data={chartData}
          className="w-full tabular-nums tracking-wide ffs-[normal] md:pb-0"
        />
      </div>
    </div>
  )
}
