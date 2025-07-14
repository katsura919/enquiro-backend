/**
 * Email parsing utilities for Gmail API responses
 */

/**
 * Extract body content and attachments from email payload
 * @param {Object} payload - Gmail API message payload
 * @returns {Object} - Object containing body text and attachments array
 */
const extractBodyAndAttachments = (payload) => {
  let body = '';
  const attachments = [];

  const processPartRecursively = (part) => {
    if (part.mimeType === 'text/plain' || part.mimeType === 'text/html') {
      // Extract text content
      if (part.body && part.body.data) {
        body += Buffer.from(part.body.data, 'base64').toString('utf-8');
      }
    } else if (part.mimeType && part.mimeType.startsWith('image/') || 
               part.mimeType && part.mimeType.startsWith('application/') ||
               part.mimeType && part.mimeType.startsWith('audio/') ||
               part.mimeType && part.mimeType.startsWith('video/')) {
      // Extract attachment information
      const attachment = {
        partId: part.partId,
        mimeType: part.mimeType,
        filename: part.filename || 'untitled',
        size: part.body ? part.body.size : 0,
        attachmentId: part.body ? part.body.attachmentId : null
      };

      // Extract additional info from headers if available
      if (part.headers) {
        part.headers.forEach(header => {
          if (header.name.toLowerCase() === 'content-disposition') {
            // Extract filename from content-disposition if not already set
            const filenameMatch = header.value.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
            if (filenameMatch && filenameMatch[1]) {
              attachment.filename = filenameMatch[1].replace(/['"]/g, '');
            }
          }
          if (header.name.toLowerCase() === 'content-id') {
            attachment.contentId = header.value;
          }
        });
      }

      attachments.push(attachment);
    }

    // Process nested parts
    if (part.parts) {
      part.parts.forEach(subPart => {
        processPartRecursively(subPart);
      });
    }
  };

  if (payload.parts) {
    // Multi-part message
    payload.parts.forEach(part => {
      processPartRecursively(part);
    });
  } else if (payload.body && payload.body.data) {
    // Single part message
    body = Buffer.from(payload.body.data, 'base64').toString('utf-8');
  }

  return { body, attachments };
};

/**
 * Parse email headers into a clean object
 * @param {Array} headers - Gmail API headers array
 * @returns {Object} - Headers as key-value pairs
 */
const parseHeaders = (headers) => {
  const parsedHeaders = {};
  if (headers && Array.isArray(headers)) {
    headers.forEach(header => {
      parsedHeaders[header.name.toLowerCase()] = header.value;
    });
  }
  return parsedHeaders;
};

/**
 * Clean and format a single email message
 * @param {Object} message - Gmail API message object
 * @returns {Object} - Cleaned message object
 */
const cleanMessage = (message) => {
  const headers = parseHeaders(message.payload?.headers);
  const { body, attachments } = extractBodyAndAttachments(message.payload);

  return {
    id: message.id,
    threadId: message.threadId,
    snippet: message.snippet,
    subject: headers.subject || 'No Subject',
    from: headers.from || 'Unknown Sender',
    to: headers.to || '',
    date: headers.date || '',
    body: body,
    attachments: attachments,
    labels: message.labelIds || [],
    sizeEstimate: message.sizeEstimate,
    internalDate: message.internalDate
  };
};

module.exports = {
  extractBodyAndAttachments,
  parseHeaders,
  cleanMessage
};
