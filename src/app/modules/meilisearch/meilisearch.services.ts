import meiliClient from '../../../shared/meilisearch';

const getAllDoctors = async (limit: number, searchTerm?: string) => {
  const index = meiliClient?.index('doctors');

  if (!index) {
    throw new Error('MeiliSearch client or index not found');
  }

  const searchString = searchTerm || ''; // Default empty string

  try {
    const result = await index.search(searchString, { limit });
    return result;
  } catch (error) {
    console.error('Error searching MeiliSearch:', error);
    throw error;
  }
};

export const MeilisearchService = {
  getAllDoctors,
};
