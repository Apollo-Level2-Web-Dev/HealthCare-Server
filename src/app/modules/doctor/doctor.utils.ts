import meiliClient from '../../../shared/meilisearch';

export const deleteDoctorFromMeili = async (doctorId: string) => {
  const index = meiliClient.index('doctors');

  try {
    await index.deleteDocument(doctorId);
    console.log(
      `Doctor with ID ${doctorId} deleted successfully from MeiliSearch.`,
    );
  } catch (error) {
    console.error('Error deleting doctor from MeiliSearch:', error);
  }
};
