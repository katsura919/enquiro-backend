# Chat Image Upload Feature Documentation

## Overview
This feature enables users to send images and files through the chat system. The implementation uses Cloudinary for file storage and includes support for multiple file types.

## Features
- ✅ Image uploads (JPEG, PNG, GIF, WebP)
- ✅ Document uploads (PDF, DOC, DOCX, TXT)
- ✅ File size limit (10MB max)
- ✅ Multiple file support
- ✅ Real-time message broadcasting
- ✅ File cleanup utilities
- ✅ Usage statistics

## Database Schema Changes

### Chat Model Updates
```javascript
{
  // Existing fields...
  message: {
    type: String,
    required: function() {
      return this.messageType === 'text';
    },
  },
  messageType: {
    type: String,
    enum: ['text', 'image', 'file'],
    required: true,
    default: 'text',
  },
  attachments: [{
    fileName: String,
    fileUrl: String,
    fileSize: Number,
    mimeType: String,
    publicId: String, // Cloudinary public ID for deletion
    uploadedAt: { type: Date, default: Date.now }
  }]
}
```

## API Endpoints

### 1. Send Text Message
```
POST /api/chat/send-message
Content-Type: application/json

{
  "businessId": "ObjectId",
  "sessionId": "ObjectId", 
  "message": "Hello world",
  "senderType": "agent|customer|ai|system",
  "agentId": "ObjectId", // required if senderType is 'agent'
  "escalationId": "ObjectId" // optional
}
```

### 2. Send Message with Single File
```
POST /api/chat/send-message-with-file
Content-Type: multipart/form-data

Fields:
- file: [File] (required)
- businessId: "ObjectId"
- sessionId: "ObjectId"
- message: "Optional caption" (optional)
- senderType: "agent|customer|ai|system"
- agentId: "ObjectId" // required if senderType is 'agent'
- escalationId: "ObjectId" // optional
```

### 3. Send Message with Multiple Files
```
POST /api/chat/send-message-with-files
Content-Type: multipart/form-data

Fields:
- files: [File Array] (max 5 files)
- businessId: "ObjectId"
- sessionId: "ObjectId"
- message: "Optional message" (optional)
- messageType: "image|file" // automatically determined
- senderType: "agent|customer|ai|system"
- agentId: "ObjectId" // required if senderType is 'agent'
- escalationId: "ObjectId" // optional
```

### 4. Get File Usage Statistics
```
GET /api/chat/files/stats/:businessId

Response:
[
  {
    "_id": "image",
    "count": 45,
    "totalSize": 15728640
  },
  {
    "_id": "file", 
    "count": 12,
    "totalSize": 8388608
  }
]
```

### 5. Cleanup Orphaned Files
```
POST /api/chat/files/cleanup/:businessId

Response:
{
  "success": true,
  "activeFiles": 57
}
```

## Frontend Integration

### JavaScript Example (Image Upload)
```javascript
const sendImageMessage = async (file, messageData) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('businessId', messageData.businessId);
  formData.append('sessionId', messageData.sessionId);
  formData.append('senderType', messageData.senderType);
  formData.append('message', messageData.caption || '');
  
  if (messageData.agentId) {
    formData.append('agentId', messageData.agentId);
  }
  
  const response = await fetch('/api/chat/send-message-with-file', {
    method: 'POST',
    body: formData,
    headers: {
      'Authorization': `Bearer ${token}` // if using auth
    }
  });
  
  return response.json();
};
```

### React Component Example
```jsx
const ImageUpload = ({ onSend }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [caption, setCaption] = useState('');
  
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file && file.size <= 10 * 1024 * 1024) { // 10MB limit
      setSelectedFile(file);
    } else {
      alert('File too large. Maximum size is 10MB.');
    }
  };
  
  const handleSend = async () => {
    if (!selectedFile) return;
    
    await sendImageMessage(selectedFile, {
      businessId: 'your-business-id',
      sessionId: 'your-session-id',
      senderType: 'customer',
      caption
    });
    
    setSelectedFile(null);
    setCaption('');
  };
  
  return (
    <div>
      <input type="file" accept="image/*" onChange={handleFileSelect} />
      <input 
        type="text" 
        placeholder="Add a caption..." 
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
      />
      <button onClick={handleSend} disabled={!selectedFile}>
        Send Image
      </button>
    </div>
  );
};
```

## Socket.IO Events

### New Message Event
```javascript
// Client-side listening
socket.on('new_message', (messageData) => {
  console.log('New message received:', messageData);
  
  if (messageData.messageType === 'image') {
    // Display image message
    displayImageMessage(messageData);
  } else if (messageData.messageType === 'file') {
    // Display file message
    displayFileMessage(messageData);
  } else {
    // Display text message
    displayTextMessage(messageData);
  }
});

// Message data structure:
{
  "_id": "ObjectId",
  "message": "Optional caption",
  "messageType": "image|file|text",
  "attachments": [
    {
      "fileName": "image.jpg",
      "fileUrl": "https://res.cloudinary.com/...",
      "fileSize": 1048576,
      "mimeType": "image/jpeg"
    }
  ],
  "senderType": "customer",
  "sessionId": "ObjectId",
  "businessId": "ObjectId",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

## File Support

### Supported Image Types
- JPEG (.jpg, .jpeg)
- PNG (.png)
- GIF (.gif)
- WebP (.webp)

### Supported Document Types
- PDF (.pdf)
- Microsoft Word (.doc, .docx)
- Plain Text (.txt)

### File Limitations
- Maximum file size: 10MB
- Maximum files per message: 5
- Automatic image optimization via Cloudinary

## Environment Variables

```bash
# Required Cloudinary configuration
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key  
CLOUDINARY_API_SECRET=your_api_secret
```

## File Storage Structure

Files are organized in Cloudinary as follows:
```
chat-uploads/
├── {businessId}/
│   ├── images/
│   └── documents/
```

## Security Considerations

1. **File Type Validation**: Only allowed file types are accepted
2. **File Size Limits**: 10MB maximum per file
3. **Virus Scanning**: Consider implementing virus scanning for production
4. **Access Control**: Files are stored publicly but URLs are not easily guessable
5. **Rate Limiting**: Consider implementing rate limits for file uploads

## Error Handling

### Common Error Responses
```javascript
// File too large
{
  "error": "File too large. Maximum size is 10MB"
}

// Invalid file type
{
  "error": "Invalid file type. Only images and documents are allowed."
}

// Upload failed
{
  "error": "Failed to upload file: [cloudinary error]"
}

// Missing required fields
{
  "error": "businessId, sessionId, and senderType are required"
}
```

## Performance Considerations

1. **Image Optimization**: Cloudinary automatically optimizes images
2. **CDN Delivery**: Files are served from Cloudinary's global CDN
3. **Lazy Loading**: Implement lazy loading for image galleries
4. **Thumbnail Generation**: Consider generating thumbnails for better UX
5. **Caching**: Implement proper caching headers

## Monitoring and Analytics

Track the following metrics:
- File upload success/failure rates
- File sizes and types
- Storage usage per business
- Popular file formats
- Upload performance

## Cleanup and Maintenance

1. **Orphaned File Cleanup**: Run periodic cleanup of unused files
2. **Storage Monitoring**: Monitor Cloudinary usage and costs
3. **File Retention**: Implement file retention policies if needed
4. **Backup Strategy**: Consider backup strategies for important files

## Troubleshooting

### Common Issues

1. **Upload Fails**: Check Cloudinary credentials and network connectivity
2. **Large Files**: Verify file size limits and multipart upload settings  
3. **File Not Displaying**: Check CORS settings and file URLs
4. **Socket Events**: Verify room names and socket connection

### Debug Commands
```bash
# Test Cloudinary connection
node -e "const cloudinary = require('cloudinary').v2; cloudinary.config({cloud_name: 'test'}); console.log(cloudinary.config());"

# Check file upload endpoint
curl -X POST -F "file=@test.jpg" -F "businessId=123" -F "sessionId=456" -F "senderType=customer" http://localhost:3000/api/chat/send-message-with-file
```
