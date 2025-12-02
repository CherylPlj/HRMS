// Helper function to format request type display
export const formatRequestType = (requestType: string, leaveType: string | null | undefined): string => {
    if (requestType === 'Undertime') {
        return 'Undertime';
    }
    return `${leaveType} Leave`;
};

// Cache for profile photos to avoid repeated API calls
const profilePhotoCache = new Map<string, string>();

export const fetchUserProfilePhoto = async (userId: string): Promise<string> => {
    // Check cache first
    if (profilePhotoCache.has(userId)) {
        return profilePhotoCache.get(userId)!;
    }

    try {
        const response = await fetch(`/api/users/${userId}`);
        if (!response.ok) {
            throw new Error('Failed to fetch user data');
        }
        const data = await response.json();
        const imageUrl = data.imageUrl || '/manprofileavatar.png';
        // Cache the result
        profilePhotoCache.set(userId, imageUrl);
        return imageUrl;
    } catch (error) {
        // Cache the default to avoid retrying failed requests
        profilePhotoCache.set(userId, '/manprofileavatar.png');
        return '/manprofileavatar.png';
    }
};

// Helper functions
export const formatDate = (date: string | Date | null): string => {
    if (!date) return 'Not set';
    try {
        const dateObj = new Date(date);
        return dateObj.toLocaleDateString();
    } catch {
        return 'Invalid date';
    }
};

export const calculateDuration = (startDate: string | Date | null, endDate: string | Date | null): string => {
    if (!startDate || !endDate) return 'N/A';
    try {
        const start = new Date(startDate);
        const end = new Date(endDate);
        // Calculate days without modifying the original time
        const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
        const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
        const diffTime = Math.abs(endDay.getTime() - startDay.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        return `${diffDays} day${diffDays > 1 ? 's' : ''}`;
    } catch {
        return 'Invalid date range';
    }
};

// Helper function to format time
export const formatTime = (dateString: string | null | undefined): string => {
    if (!dateString) return 'N/A';
    try {
        return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
        return 'Invalid time';
    }
};

