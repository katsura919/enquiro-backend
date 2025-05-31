require('dotenv').config();
const { HfInference } = require('@huggingface/inference');

const hf = new HfInference(process.env.HF_API_KEY);

async function generateEmbedding(text) {
    try {
        const response = await hf.featureExtraction({
            model: 'sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2',
            inputs: text,
        });

        if (!Array.isArray(response)) {
            console.error('Unexpected response format:', response);
            return null;
        }

        return response; // This is the embedding array
    } catch (error) {
        console.error('Error generating embedding:', error);
        return null;
    }
}

module.exports = generateEmbedding;
