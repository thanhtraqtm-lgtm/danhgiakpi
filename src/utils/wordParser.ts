import mammoth from 'mammoth';
import { SelfAssessmentDoc } from '../types';

export async function parseWordDoc(file: File, userNameCandidate: string = ''): Promise<SelfAssessmentDoc> {
  const arrayBuffer = await file.arrayBuffer();
  let text = '';

  try {
    const result = await mammoth.extractRawText({ arrayBuffer });
    text = result.value || '';
  } catch (err) {
    // Fallback if file is pure plain text or doc format fallback
    const decoder = new TextDecoder('utf-8');
    text = decoder.decode(arrayBuffer);
  }

  // Basic word count calculation
  const cleanText = text.trim().replace(/\s+/g, ' ');
  const wordCount = cleanText ? cleanText.split(' ').length : 0;

  // Try extracting user name if present in text "Họ và tên: XYZ" or "Họ tên: XYZ"
  let userName = userNameCandidate || 'Cán bộ / Nhân sự';
  const nameMatch = text.match(/(?:Họ và tên|Họ tên|Tên cán bộ)\s*[:\-]\s*([^\n\r]+)/i);
  if (nameMatch && nameMatch[1]) {
    userName = nameMatch[1].trim();
  }

  return {
    id: 'doc_' + Date.now(),
    fileName: file.name,
    userName,
    uploadDate: new Date().toISOString().split('T')[0],
    extractedContent: text || 'Chưa trích xuất được nội dung từ văn bản này.',
    wordCount,
  };
}
