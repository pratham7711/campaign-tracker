import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, WidthType, AlignmentType, HeadingLevel, BorderStyle } from 'docx'
import { saveAs } from 'file-saver'

export function exportVotersToPdf(voters, filters) {
  const doc = new jsPDF()

  // Title
  doc.setFontSize(18)
  doc.text('Voter List Export', 14, 22)

  // Filter info
  doc.setFontSize(10)
  doc.setTextColor(100)

  const filterParts = []
  if (filters.name) filterParts.push(`Name: ${filters.name}`)
  if (filters.pincode) filterParts.push(`Pincode: ${filters.pincode}`)
  if (filters.address) filterParts.push(`Address: ${filters.address}`)

  const filterText = filterParts.length > 0
    ? `Filters: ${filterParts.join(' | ')}`
    : 'Filters: None'
  doc.text(filterText, 14, 30)

  // Total count and timestamp
  doc.text(`Total Records: ${voters.length}`, 14, 36)
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 42)

  // Table data
  const tableData = voters.map((voter, index) => [
    index + 1,
    voter.fullName || '-',
    voter.contact || 'No contact',
    voter.address || '-',
    voter.pincode || '-'
  ])

  // Generate table
  autoTable(doc, {
    startY: 50,
    head: [['#', 'Name', 'Contact', 'Address', 'Pincode']],
    body: tableData,
    styles: {
      fontSize: 8,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [59, 130, 246],
      textColor: 255,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [245, 247, 250],
    },
    columnStyles: {
      0: { cellWidth: 12 },
      1: { cellWidth: 45 },
      2: { cellWidth: 35 },
      3: { cellWidth: 70 },
      4: { cellWidth: 25 },
    },
  })

  // Footer with page numbers
  const pageCount = doc.internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(150)
    doc.text(
      `Page ${i} of ${pageCount}`,
      doc.internal.pageSize.width / 2,
      doc.internal.pageSize.height - 10,
      { align: 'center' }
    )
  }

  // Generate filename with filters
  const namePart = filters.name ? `_${filters.name}` : ''
  const pincodePart = filters.pincode ? `_${filters.pincode}` : ''
  const timestamp = new Date().toISOString().split('T')[0]
  const filename = `voters${namePart}${pincodePart}_${timestamp}.pdf`

  doc.save(filename)
}

export function exportVotersToListPdf(voters, filters) {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.width
  const pageHeight = doc.internal.pageSize.height
  const margin = 20
  const lineHeight = 12
  let yPosition = margin

  voters.forEach((voter, index) => {
    // Check if we need a new page
    if (yPosition > pageHeight - margin - 20) {
      doc.addPage()
      yPosition = margin
    }

    const name = voter.fullName || '-'
    const contact = voter.contact || 'No contact'
    const address = voter.address || '-'

    const text = `${name} Contact: ${contact} Address: ${address}`

    // Use splitTextToSize to handle long text wrapping
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    const lines = doc.splitTextToSize(text, pageWidth - margin * 2)

    // Check if wrapped text fits on page
    const textHeight = lines.length * lineHeight
    if (yPosition + textHeight > pageHeight - margin) {
      doc.addPage()
      yPosition = margin
    }

    doc.text(lines, margin, yPosition)
    yPosition += textHeight + 8 // Add spacing between entries
  })

  // Footer with page numbers
  const pageCount = doc.internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(150)
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    )
  }

  // Generate filename
  const namePart = filters.name ? `_${filters.name}` : ''
  const pincodePart = filters.pincode ? `_${filters.pincode}` : ''
  const timestamp = new Date().toISOString().split('T')[0]
  const filename = `voters_list${namePart}${pincodePart}_${timestamp}.pdf`

  doc.save(filename)
}

export async function exportVotersToDocx(voters, filters) {
  // Build filter text
  const filterParts = []
  if (filters.name) filterParts.push(`Name: ${filters.name}`)
  if (filters.pincode) filterParts.push(`Pincode: ${filters.pincode}`)
  if (filters.address) filterParts.push(`Address: ${filters.address}`)
  const filterText = filterParts.length > 0 ? filterParts.join(' | ') : 'None'

  // Create table rows
  const tableRows = [
    // Header row
    new TableRow({
      children: ['#', 'Name', 'Contact', 'Address', 'Pincode'].map(text =>
        new TableCell({
          children: [new Paragraph({
            children: [new TextRun({ text, bold: true, color: 'FFFFFF' })],
            alignment: AlignmentType.CENTER,
          })],
          shading: { fill: '3B82F6' },
        })
      ),
    }),
    // Data rows
    ...voters.map((voter, index) =>
      new TableRow({
        children: [
          String(index + 1),
          voter.fullName || '-',
          voter.contact || 'No contact',
          voter.address || '-',
          voter.pincode || '-'
        ].map(text =>
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text, size: 20 })] })],
          })
        ),
      })
    ),
  ]

  const doc = new Document({
    sections: [{
      children: [
        new Paragraph({
          children: [new TextRun({ text: 'Voter List Export', bold: true, size: 36 })],
          heading: HeadingLevel.HEADING_1,
        }),
        new Paragraph({
          children: [new TextRun({ text: `Filters: ${filterText}`, size: 20, color: '666666' })],
        }),
        new Paragraph({
          children: [new TextRun({ text: `Total Records: ${voters.length}`, size: 20, color: '666666' })],
        }),
        new Paragraph({
          children: [new TextRun({ text: `Generated: ${new Date().toLocaleString()}`, size: 20, color: '666666' })],
        }),
        new Paragraph({ children: [] }), // Spacer
        new Table({
          rows: tableRows,
          width: { size: 100, type: WidthType.PERCENTAGE },
        }),
      ],
    }],
  })

  const blob = await Packer.toBlob(doc)
  const namePart = filters.name ? `_${filters.name}` : ''
  const pincodePart = filters.pincode ? `_${filters.pincode}` : ''
  const timestamp = new Date().toISOString().split('T')[0]
  saveAs(blob, `voters${namePart}${pincodePart}_${timestamp}.docx`)
}

export async function exportVotersToListDocx(voters, filters) {
  const paragraphs = voters.map((voter) => {
    const name = voter.fullName || '-'
    const contact = voter.contact || 'No contact'
    const address = voter.address || '-'

    return new Paragraph({
      children: [
        new TextRun({ text: name, bold: true }),
        new TextRun({ text: ` Contact: ${contact}` }),
        new TextRun({ text: ` Address: ${address}` }),
      ],
      spacing: { after: 200 },
    })
  })

  const doc = new Document({
    sections: [{
      children: [
        new Paragraph({
          children: [new TextRun({ text: 'Voter List', bold: true, size: 36 })],
          heading: HeadingLevel.HEADING_1,
        }),
        new Paragraph({
          children: [new TextRun({ text: `Total: ${voters.length} voters`, size: 20, color: '666666' })],
          spacing: { after: 400 },
        }),
        ...paragraphs,
      ],
    }],
  })

  const blob = await Packer.toBlob(doc)
  const namePart = filters.name ? `_${filters.name}` : ''
  const pincodePart = filters.pincode ? `_${filters.pincode}` : ''
  const timestamp = new Date().toISOString().split('T')[0]
  saveAs(blob, `voters_list${namePart}${pincodePart}_${timestamp}.docx`)
}
