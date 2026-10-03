const hash = (value) => {
  let result = 0;
  for (let index = 0; index < value.length; index += 1) {
    result = (result * 31 + value.charCodeAt(index)) | 0;
  }
  return String(result);
};

export const hashMarkdown = (markdown) => hash(markdown || '');

export function toHistoryRecord(evaluation) {
  const record = { ...evaluation };
  delete record.pdf;
  return { ...record, id: `${record.createdAt}-${record.sourceHash}` };
}
