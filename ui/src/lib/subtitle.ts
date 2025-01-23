import type { SubtitleData } from '@/components/subtitle/columns'

export const getFileId = (row: SubtitleData & { _rowId?: string }) => row._rowId ?? String(row.attributes.files[0]?.file_id ?? '')
