export interface Study {
    protocolSection: {
        identificationModule: {
            nctId: string;
            briefTitle: string;
            organization: {
                fullName: string;
            };
        };
        statusModule: {
            overallStatus: string;
        };
        descriptionModule: {
            briefSummary: string;
        };
        designModule: {
            studyType: string;
            phases?: string[];
        };
    };
    hasDerivedSection: {
        conditionBrowseModule: {
            meshes: {
                term: string;
            }[];
        };
    };
}

export const fetchClinicalTrials = async (query: string = "heart"): Promise<Study[]> => {
    try {
        const response = await fetch(
            `https://clinicaltrials.gov/api/v2/studies?query.term=${query}&filter.overallStatus=RECRUITING&pageSize=10`
        );

        if (!response.ok) {
            throw new Error("Failed to fetch clinical trials");
        }

        const data = await response.json();
        return data.studies || [];
    } catch (error) {
        console.error("Error fetching clinical trials:", error);
        return [];
    }
};
