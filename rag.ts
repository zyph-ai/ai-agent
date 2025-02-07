import { Index } from "@upstash/vector";

export class UpstashVector {
  private index: Index;

  /**
   * Initializes the UpstashVector client.
   * @param url - The URL of the Upstash Vector index.
   * @param token - The token for authenticating with Upstash Vector.
   */
  constructor(url: string, token: string) {
    this.index = new Index({ url, token });
  }

  /**
   * Stores documents in the Upstash Vector index.
   * @param documents - An array of documents to store.
   * @param generateEmbedding - A function to generate embeddings for the documents.
   */
  async storeDocuments(
    documents: { id: string; text: string }[],
    generateEmbedding: (text: string) => Promise<number[]>
  ) {
    for (const doc of documents) {
      const embedding = await generateEmbedding(doc.text);
      await this.index.upsert({
        id: doc.id,
        vector: embedding,
        metadata: { text: doc.text },
      });
    }
  }

  /**
   * Retrieves relevant documents from the Upstash Vector index.
   * @param queryEmbedding - The embedding of the query.
   * @param topK - The number of documents to retrieve.
   * @returns An array of relevant document texts.
   */
  async retrieveDocuments(queryEmbedding: number[], topK: number = 5) {
    const results = await this.index.query({
      vector: queryEmbedding,
      topK,
      includeMetadata: true,
    });

    return results.map((result) => result.metadata?.text as string);
  }
}
