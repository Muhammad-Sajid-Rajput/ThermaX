import { fetchReports } from '../../services/api';
import useApiResource from '../api/useApiResource';
function useReports(filters) {
  return useApiResource(fetchReports, filters);
}
export default useReports;
