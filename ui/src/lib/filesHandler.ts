// https://github.com/mozilla/pdf.js/issues/10478
import type { FileTypeResult } from 'file-type'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import type { TextContent } from 'pdfjs-dist/types/src/display/api'

import { fileTypeFromBuffer } from 'file-type'
import { getDocument } from 'pdfjs-dist'
import 'pdfjs-dist/build/pdf.worker.mjs'

interface FileContent {
  text: string
  error?: string
}

type RecursiveArray<T> = T | RecursiveArray<T>[]

type EntryFiles = RecursiveArray<FileContent>

const FORMAT_ERROR = 'Unsupported file format'

function formatTextContent(textContent: TextContent) {
  const lines = textContent.items.map((item) => {
    let text = ''
    if ('transform' in item) {
      text = item.str
      if (item.hasEOL)
        text += '\n'
    }
    return text
  })
  return lines.join(' ')
}

async function getDocumentText(pdf: PDFDocumentProxy) {
  const pdfTexts: string [] = []

  for (let i = 1; i < pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const textContent = await page.getTextContent()
    const text = formatTextContent(textContent)
    pdfTexts.push(text)
  }

  return pdfTexts.join(' ')
}

const HUMAN_READABLE_FILE_EXTENSIONS: `.${string}`[] = [
  // General Text-Based Formats
  '.csv',
  '.rtf',
  '.tsv',
  '.txt',

  // Markup, Web, Scripting, Programming, Template and View Languages
  '.c',
  '.cjs',
  '.cpp',
  '.css',
  '.cxx',
  '.ejs',
  '.go',
  '.handlebars',
  '.hbs',
  '.hpp',
  '.htm',
  '.html',
  '.hxx',
  '.java',
  '.js',
  '.json',
  '.jsx',
  '.lua',
  '.md',
  '.php',
  '.pl',
  '.pug',
  '.py',
  '.rb',
  '.sh',
  '.rs',
  '.rss',
  '.sass',
  '.scss',
  '.sql',
  '.styl',
  '.svelte',
  '.swift',
  '.ts',
  '.tsx',
  '.vue',
  '.yaml',
  '.yml',
  '.xhtml',
  '.xml',

  // Configuration and Data Files
  '.ini',
  '.conf',
  '.cfg',
  '.toml',
  '.ovpn',
  '.properties',
  '.env',

  // Documentation and Publishing
  '.tex',
  '.adoc',
  '.asciidoc',
  '.rst',
  '.bib',
  '.feature',

  // Development and Build Related
  '.dockerfile',
  '.gradle',
  '.gitignore',
  '.makefile',

  // Miscellaneous
  '.ass',
  '.bat',
  '.log',
  '.nfo',
  '.patch',
  '.ps1',
  '.srt',
  '.m3u',
]

export const SUPPORTED_FILE_TYPES = [
  'text/*',
]

export const SUPPORTED_FILE_EXTENSIONS = [
  ...HUMAN_READABLE_FILE_EXTENSIONS,
  '.pdf',
]

function getFileType(file: File) {
  return new Promise<FileTypeResult | undefined>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = async (e) => {
      let fileType: FileTypeResult | undefined
      const document = e.target?.result
      if (document instanceof ArrayBuffer)
        fileType = await fileTypeFromBuffer(document)

      resolve(fileType)
    }
    reader.readAsArrayBuffer(file)
  })
}

async function readFile(file: File, { name, type }: Pick<File, 'name' | 'type'> = { name: file.name, type: file.type }) {
  return new Promise<FileContent>((resolve, reject) => {
    const reader = new FileReader()

    if (name.endsWith('.pdf')) {
      reader.onload = async (e) => {
        const document = e.target?.result
        if (document instanceof ArrayBuffer) {
          const pdf = await getDocument(document).promise
          const text = await getDocumentText(pdf)
          resolve({
            text,
          })
        }
      }
      reader.readAsArrayBuffer(file)
    }
    else if (type.startsWith('text/') || HUMAN_READABLE_FILE_EXTENSIONS.some((ext) => name.endsWith(ext))) {
      reader.onload = (e) => {
        const result = e.target?.result
        if (typeof result === 'string') {
          resolve({
            text: result,
          })
        }
      }
      reader.readAsText(file)
    }
    else {
      resolve({
        text: 'test',
        error: FORMAT_ERROR,
      })
    }

    reader.onerror = reject
  })
}

function isDirectoryEntry(entry: FileSystemEntry): entry is FileSystemDirectoryEntry {
  return entry.isDirectory
}

function isFileEntry(entry: FileSystemEntry): entry is FileSystemFileEntry {
  return entry.isFile
}

export class DataTransferItemListReader {
  constructor(private fileTypes: string[] = []) {}

  private readEntry(entry: FileSystemEntry) {
    if (isDirectoryEntry(entry))
      return this.readDirectory(entry)
    else if (isFileEntry(entry))
      return this.readFile(entry)

    return Promise.reject(new Error('Entry is neither a file nor a directory'))
  }

  private readFile(fileSystemEntry: FileSystemFileEntry) {
    return new Promise<FileContent>((resolve) => {
      fileSystemEntry.file(async (file) => {
        let { type, name } = file
        if (!type) {
          const fileType = await getFileType(file)
          if (fileType) {
            const { ext, mime } = fileType
            type = mime
            if (ext)
              name = `${name}.${ext}`
          }
        }

        if (this.fileTypes.some((fileType) => name.endsWith(fileType))) {
          const res = await readFile(file, { type, name })
          resolve(res)
        }
        else {
          resolve({
            text: '',
            error: FORMAT_ERROR,
          })
        }
      })
    })
  }

  private readDirectory(systemDirectoryEntry: FileSystemDirectoryEntry) {
    return new Promise<EntryFiles>((resolve) => {
      const directoryReader = systemDirectoryEntry.createReader()
      directoryReader.readEntries(async (entries) => {
        const promises = entries.map((entry) => this.readEntry(entry))
        const results = await Promise.all(promises)
        resolve(results)
      })
    })
  }

  readDataTransferItemList(list: DataTransferItemList) {
    return Array.from(list)
      .filter((item) => item.kind === 'file')
      .map((item) => {
        const fileSystemEntry = item.webkitGetAsEntry()
        if (fileSystemEntry)
          return this.readEntry(fileSystemEntry)

        return Promise.reject(new Error('Entry is null'))
      })
  }
}

export async function getFileContent(fileList: FileList) {
  if (fileList.length === 1) {
    const file = fileList[0]
    if (file) {
      const fileContent = await readFile(file)
      return {
        value: fileContent.text,
        name: file.name,
      }
    }
  }

  const promises = Array.from(fileList).map((file) => readFile(file))

  const files = await Promise.all(promises)
  const combinedContent = files.reduce((pre, { text }) => pre + text, '')
  const combinedName = `${files.length} files selected`
  return {
    value: combinedContent,
    name: combinedName,
  }
}

export function readEntryFiles(entryFiles: EntryFiles, level = 0) {
  let content = ''
  let foldersCount = 0
  let filesCount = 0

  for (const entry of Array.isArray(entryFiles) ? entryFiles : [entryFiles]) {
    if (Array.isArray(entry)) {
      const result = readEntryFiles(entry, level + 1)
      content += result.content
      foldersCount += result.title.split(', ')[0] === '0 folders' ? 0 : 1
      const titles = result.title.split(', ')
      if (titles[1])
        filesCount += Number(titles[1].split(' ')[0])
    }
    else {
      content += entry.text
      filesCount += 1
    }
  }

  return {
    content,
    title: `${foldersCount + level} folder(s), ${filesCount} file(s)`,
  }
}
