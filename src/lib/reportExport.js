import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import writeExcelFile from 'write-excel-file/browser';

const COLORS = {
  primary: '#765044',
  accent: '#f2c078',
  pale: '#fff3db',
  muted: '#6f625d',
  border: '#dbcac2',
  white: '#ffffff',
};

const ORDER_STATUS_LABELS = {
  pending: 'Nouă',
  processing: 'În pregătire',
  completed: 'Finalizată',
  executed: 'Executată',
};

function formatOrderNumber(order) {
  return order.order_number
    ? `ART-${order.order_number}`
    : `#${String(order.id || '').slice(0, 8).toUpperCase()}`;
}

function formatDateTime(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('ro-MD', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

function formatCalendarDate(value) {
  if (!value) return '—';
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('ro-MD', { dateStyle: 'long' }).format(date);
}

function getReportPeriod({ mode, day, start, end }) {
  if (mode === 'period') {
    return `${formatCalendarDate(start)} – ${formatCalendarDate(end)}`;
  }
  return formatCalendarDate(day);
}

function getFileSuffix({ mode, day, start, end }) {
  return mode === 'period' ? `${start}_${end}` : day;
}

function getReportRows(orders) {
  return orders.flatMap((order) => {
    const items = order.order_items || [];
    if (items.length === 0) {
      return [{
        orderNumber: formatOrderNumber(order),
        date: formatDateTime(order.created_at),
        status: ORDER_STATUS_LABELS[order.status] || order.status || '—',
        product: '—',
        quantity: 0,
        unitPrice: 0,
        total: 0,
      }];
    }

    return items.map((item) => ({
      orderNumber: formatOrderNumber(order),
      date: formatDateTime(order.created_at),
      status: ORDER_STATUS_LABELS[order.status] || order.status || '—',
      product: String(item.product_name || '—'),
      quantity: Number(item.quantity || 0),
      unitPrice: Number(item.price || 0),
      total: Number(item.price || 0) * Number(item.quantity || 0),
    }));
  });
}

function getReportTotals(orders) {
  return orders.reduce((totals, order) => ({
    orders: totals.orders + 1,
    quantity: totals.quantity + (order.order_items || []).reduce(
      (sum, item) => sum + Number(item.quantity || 0),
      0,
    ),
    amount: totals.amount + Number(order.total || 0),
  }), { orders: 0, quantity: 0, amount: 0 });
}

function safeSpreadsheetText(value) {
  const text = String(value ?? '');
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
}

function excelCell(value, options = {}) {
  return { value, ...options };
}

export async function exportReportExcel(report) {
  const rows = getReportRows(report.orders);
  const totals = getReportTotals(report.orders);
  const headerStyle = {
    fontWeight: 'bold',
    backgroundColor: COLORS.primary,
    textColor: COLORS.white,
    align: 'center',
    verticalAlign: 'center',
  };
  const moneyStyle = { type: Number, format: '#,##0.00 "MDL"' };

  const sheetData = [
    [excelCell('RAPORT COMENZI — ARTICHOKE', {
      fontWeight: 'bold',
      fontSize: 16,
      textColor: COLORS.primary,
      columnSpan: 7,
      align: 'center',
    }), null, null, null, null, null, null],
    [excelCell(`Perioada: ${getReportPeriod(report)}`, {
      fontWeight: 'bold',
      columnSpan: 7,
      align: 'center',
    }), null, null, null, null, null, null],
    [],
    [
      excelCell('Comenzi', { fontWeight: 'bold', backgroundColor: COLORS.pale }),
      excelCell(totals.orders, { type: Number, backgroundColor: COLORS.pale }),
      excelCell('Produse', { fontWeight: 'bold', backgroundColor: COLORS.pale }),
      excelCell(totals.quantity, { type: Number, backgroundColor: COLORS.pale }),
      excelCell('Valoare totală', { fontWeight: 'bold', backgroundColor: COLORS.pale }),
      excelCell(totals.amount, { ...moneyStyle, backgroundColor: COLORS.pale }),
      null,
    ],
    [],
    ['Comandă', 'Data', 'Stare', 'Produs', 'Cantitate', 'Preț unitar', 'Total'].map(
      (value) => excelCell(value, headerStyle),
    ),
    ...rows.map((row) => [
      safeSpreadsheetText(row.orderNumber),
      safeSpreadsheetText(row.date),
      safeSpreadsheetText(row.status),
      safeSpreadsheetText(row.product),
      excelCell(row.quantity, { type: Number, align: 'center' }),
      excelCell(row.unitPrice, moneyStyle),
      excelCell(row.total, moneyStyle),
    ]),
    [],
    [
      excelCell('TOTAL RAPORT', {
        fontWeight: 'bold',
        backgroundColor: COLORS.accent,
        columnSpan: 4,
        align: 'right',
      }), null, null, null,
      excelCell(totals.quantity, {
        type: Number,
        fontWeight: 'bold',
        backgroundColor: COLORS.accent,
        align: 'center',
      }),
      null,
      excelCell(totals.amount, {
        ...moneyStyle,
        fontWeight: 'bold',
        backgroundColor: COLORS.accent,
      }),
    ],
  ];

  await writeExcelFile(sheetData, {
    sheet: 'Raport comenzi',
    columns: [
      { width: 16 },
      { width: 20 },
      { width: 18 },
      { width: 34 },
      { width: 12 },
      { width: 16 },
      { width: 16 },
    ],
    orientation: 'landscape',
    stickyRowsCount: 6,
    showGridLines: false,
  }).toFile(`raport-artichoke-${getFileSuffix(report)}.xlsx`);
}

export async function exportReportPdf(report) {
  const rows = getReportRows(report.orders);
  const totals = getReportTotals(report.orders);
  const generatedAt = formatDateTime(new Date());

  pdfMake.addVirtualFileSystem(pdfFonts);

  const documentDefinition = {
    pageSize: 'A4',
    pageOrientation: 'landscape',
    pageMargins: [28, 34, 28, 34],
    defaultStyle: { font: 'Roboto', fontSize: 8.5, color: '#342b28' },
    info: {
      title: `Raport comenzi Artichoke — ${getReportPeriod(report)}`,
      author: 'Artichoke',
      subject: 'Raport comenzi',
    },
    footer(currentPage, pageCount) {
      return {
        columns: [
          { text: `Generat: ${generatedAt}`, alignment: 'left' },
          { text: `Pagina ${currentPage} din ${pageCount}`, alignment: 'right' },
        ],
        margin: [28, 0],
        color: COLORS.muted,
        fontSize: 7,
      };
    },
    content: [
      { text: 'RAPORT COMENZI', style: 'title' },
      { text: 'ARTICHOKE', style: 'brand' },
      { text: `Perioada: ${getReportPeriod(report)}`, style: 'period' },
      {
        table: {
          widths: ['*', '*', '*'],
          body: [[
            { stack: [{ text: 'COMENZI', style: 'summaryLabel' }, { text: String(totals.orders), style: 'summaryValue' }] },
            { stack: [{ text: 'PRODUSE', style: 'summaryLabel' }, { text: String(totals.quantity), style: 'summaryValue' }] },
            { stack: [{ text: 'VALOARE TOTALĂ', style: 'summaryLabel' }, { text: `${totals.amount.toFixed(2)} MDL`, style: 'summaryValue' }] },
          ]],
        },
        layout: {
          fillColor: () => COLORS.pale,
          hLineColor: () => COLORS.border,
          vLineColor: () => COLORS.border,
          paddingLeft: () => 12,
          paddingRight: () => 12,
          paddingTop: () => 8,
          paddingBottom: () => 8,
        },
        margin: [0, 0, 0, 16],
      },
      {
        table: {
          headerRows: 1,
          widths: [64, 76, 76, '*', 48, 66, 66],
          body: [
            ['Comandă', 'Data', 'Stare', 'Produs', 'Cant.', 'Preț unitar', 'Total'].map(
              (text) => ({ text, style: 'tableHeader' }),
            ),
            ...rows.map((row) => [
              row.orderNumber,
              row.date,
              row.status,
              row.product,
              { text: String(row.quantity), alignment: 'center' },
              { text: `${row.unitPrice.toFixed(2)} MDL`, alignment: 'right' },
              { text: `${row.total.toFixed(2)} MDL`, alignment: 'right' },
            ]),
            [
              { text: 'TOTAL RAPORT', colSpan: 4, alignment: 'right', style: 'tableTotal' },
              {}, {}, {},
              { text: String(totals.quantity), alignment: 'center', style: 'tableTotal' },
              '',
              { text: `${totals.amount.toFixed(2)} MDL`, alignment: 'right', style: 'tableTotal' },
            ],
          ],
        },
        layout: {
          fillColor(rowIndex) {
            if (rowIndex === 0) return COLORS.primary;
            if (rowIndex === rows.length + 1) return COLORS.accent;
            return rowIndex % 2 === 0 ? '#fffaf0' : COLORS.white;
          },
          hLineColor: () => COLORS.border,
          vLineColor: () => COLORS.border,
          paddingLeft: () => 6,
          paddingRight: () => 6,
          paddingTop: () => 5,
          paddingBottom: () => 5,
        },
      },
    ],
    styles: {
      title: { fontSize: 21, bold: true, color: COLORS.primary, alignment: 'center' },
      brand: { fontSize: 10, bold: true, color: COLORS.accent, alignment: 'center', characterSpacing: 2 },
      period: { fontSize: 10, color: COLORS.muted, alignment: 'center', margin: [0, 5, 0, 14] },
      summaryLabel: { fontSize: 7, bold: true, color: COLORS.muted, alignment: 'center' },
      summaryValue: { fontSize: 13, bold: true, color: COLORS.primary, alignment: 'center', margin: [0, 2, 0, 0] },
      tableHeader: { bold: true, color: COLORS.white, alignment: 'center' },
      tableTotal: { bold: true, color: '#342b28' },
    },
  };

  await pdfMake.createPdf(documentDefinition).download(
    `raport-artichoke-${getFileSuffix(report)}.pdf`,
  );
}
