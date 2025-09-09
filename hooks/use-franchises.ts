import useSWR from "swr";
import {
  getFranchiseList,
  FranchiseListItem,
} from "@/services/franchise.service";

// SWR fetcher
const fetchFranchiseList = async (): Promise<FranchiseListItem[]> => {
  return await getFranchiseList();
};

// SWR key
export const FRANCHISE_LIST_KEY = "/franchise/list";

// Custom hook
export function useFranchiseList() {
  const {
    data,
    error,
    isLoading,
    mutate: revalidate,
  } = useSWR(FRANCHISE_LIST_KEY, fetchFranchiseList);

  return {
    franchises: data || [],
    isLoading,
    error,
    revalidate,
  };
}
