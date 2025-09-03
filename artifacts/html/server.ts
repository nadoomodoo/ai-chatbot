import { z } from 'zod';
import { streamObject } from 'ai';
import { myProvider } from '@/lib/ai/providers';
import { htmlPrompt, updateDocumentPrompt } from '@/lib/ai/prompts';
import { createDocumentHandler } from '@/lib/artifacts/server';

// Helper function to find HTML content in object properties
function findHtmlContent(object: any): string | null {
  // Look for properties that contain HTML content
  for (const [key, value] of Object.entries(object)) {
    if (typeof value === 'string' && value.trim().startsWith('<!DOCTYPE html>')) {
      console.log(`Found HTML content in property: ${key}`);
      return value;
    }
  }
  return null;
}

export const htmlDocumentHandler = createDocumentHandler<'html'>({
  kind: 'html',
  onCreateDocument: async ({ title, content, dataStream }) => {
    let draftContent = '';

    const { fullStream } = streamObject({
      model: myProvider.languageModel('artifact-model'),
      mode: 'json',
      system: htmlPrompt  + (content ? `Here is the given content:\n${content}` : '') + `\n\nCRITICAL: You must respond with JSON containing ONLY an "html" property. Do not use properties like "testing", "background-color", "color", etc.`,
      prompt: title,
      schema: z.object({
        html: z.string().describe('Complete HTML document starting with <!DOCTYPE html>'),
      }),
      schemaName: 'htmlDocument',
    });

    for await (const delta of fullStream) {

      const { type } = delta;

      if (type === 'object') {
        const { object } = delta;

        // Check if html property exists
        if ('html' in object) {
          const { html } = object;

          if (html && html.trim()) {
            dataStream.write({
              type: 'data-htmlDelta',
              data: html,
              transient: true,
            });

            draftContent = html;
          }
        } else {
          console.warn('No html property in object:', Object.keys(object));
          console.warn('This indicates the AI model is not following the schema correctly');
          
          // Try to find HTML content in other properties
          const htmlContent = findHtmlContent(object);
          if (htmlContent) {
            console.log('Found HTML content in alternative property:', htmlContent.length, 'characters');
            dataStream.write({
              type: 'data-htmlDelta',
              data: htmlContent,
              transient: true,
            });
            draftContent = htmlContent;
          }
        }
      }
    }

    return draftContent;
  },
  onUpdateDocument: async ({ document, description, content, dataStream }) => {
    if (content) {
      dataStream.write({
        type: 'data-htmlDelta',
        data: content,
        transient: true,
      });
      
      return content;
    }

    let draftContent = '';

    const { fullStream } = streamObject({
      model: myProvider.languageModel('artifact-model'),
      mode: 'json',
      system: updateDocumentPrompt(document.content, 'html') + `\n\nCRITICAL: You must respond with JSON containing ONLY an "html" property. Do not use properties like "testing", "background-color", "color", etc.`,
      prompt: description,
      schema: z.object({
        html: z.string().describe('Complete updated HTML document starting with <!DOCTYPE html>'),
      }),
      schemaName: 'htmlDocument',
    });

    for await (const delta of fullStream) {
      const { type } = delta;

      if (type === 'object') {
        const { object } = delta;
        
        // Check if html property exists
        if ('html' in object) {
          const { html } = object;

          if (html && html.trim()) {
            dataStream.write({
              type: 'data-htmlDelta',
              data: html,
              transient: true,
            });

            draftContent = html;
          }
        } else {
          console.warn('No html property in update object:', Object.keys(object));
          console.warn('This indicates the AI model is not following the schema correctly');
          
          // Try to find HTML content in other properties
          const htmlContent = findHtmlContent(object);
          if (htmlContent) {
            console.log('Found HTML content in alternative property:', htmlContent.length, 'characters');
            dataStream.write({
              type: 'data-htmlDelta',
              data: htmlContent,
              transient: true,
            });
            draftContent = htmlContent;
          }
        }
      }
    }

    return draftContent;
  },
});
