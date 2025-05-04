/**
 * CSV Parser utility for processing uploaded CSV files
 */

interface CSVRow {
  TeamName: string
  ID_Proof: string
  Bank_details: string
  Invoice: string
  [key: string]: string
}

export async function parseCSV(file: File): Promise<CSVRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (event) => {
      try {
        const csvText = event.target?.result as string
        if (!csvText) {
          throw new Error("Failed to read CSV file")
        }

        // Split the CSV text into lines
        const lines = csvText.split(/\r\n|\n/)
        if (lines.length < 2) {
          throw new Error("CSV file must contain at least a header row and one data row")
        }

        // Parse the header row
        const headers = lines[0].split(",").map((header) => header.trim())

        // Validate required headers
        const requiredHeaders = ["TeamName", "ID_Proof", "Bank_details", "Invoice"]
        const missingHeaders = requiredHeaders.filter((header) => !headers.includes(header))

        if (missingHeaders.length > 0) {
          throw new Error(`CSV is missing required headers: ${missingHeaders.join(", ")}`)
        }

        // Parse the data rows
        const results: CSVRow[] = []

        for (let i = 1; i < lines.length; i++) {
          if (!lines[i].trim()) continue // Skip empty lines

          const values = lines[i].split(",").map((value) => value.trim())

          if (values.length !== headers.length) {
            console.warn(`Line ${i + 1} has ${values.length} values, expected ${headers.length}. Skipping.`)
            continue
          }

          const row: CSVRow = {} as CSVRow
          headers.forEach((header, index) => {
            row[header] = values[index]
          })

          results.push(row)
        }

        resolve(results)
      } catch (error) {
        reject(error)
      }
    }

    reader.onerror = () => {
      reject(new Error("Error reading the CSV file"))
    }

    reader.readAsText(file)
  })
}

export function validateCSVData(data: CSVRow[]): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (data.length === 0) {
    errors.push("CSV file contains no data rows")
    return { valid: false, errors }
  }

  // Validate each row has non-empty values for required fields
  data.forEach((row, index) => {
    const rowNum = index + 1

    if (!row.TeamName) {
      errors.push(`Row ${rowNum}: Missing TeamName`)
    }

    if (!row.ID_Proof) {
      errors.push(`Row ${rowNum}: Missing ID_Proof`)
    }

    if (!row.Bank_details) {
      errors.push(`Row ${rowNum}: Missing Bank_details`)
    }

    if (!row.Invoice) {
      errors.push(`Row ${rowNum}: Missing Invoice`)
    }
  })

  return {
    valid: errors.length === 0,
    errors,
  }
}

export function convertCSVToDownloadTasks(data: CSVRow[]): any[] {
  return data.map((row) => ({
    folderName: row.TeamName,
    fileIds: [
      [extractGoogleDriveId(row.ID_Proof), "ID_Proof"],
      [extractGoogleDriveId(row.Bank_details), "Bank_details"],
      [extractGoogleDriveId(row.Invoice), "Invoice"],
    ],
  }))
}

function extractGoogleDriveId(url: string): string {
  // Handle different Google Drive URL formats
  if (!url) return ""

  // Format: https://drive.google.com/file/d/{fileId}/view
  const fileIdMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)
  if (fileIdMatch) return fileIdMatch[1]

  // Format: https://drive.google.com/open?id={fileId}
  const openIdMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/)
  if (openIdMatch) return openIdMatch[1]

  // If it's already just an ID, return it
  if (/^[a-zA-Z0-9_-]{25,}$/.test(url)) return url

  // If no match found, return the original string (might be an ID already)
  return url
}
