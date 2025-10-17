# Directory Module

## Overview
The Directory module provides a comprehensive employee directory system similar to OrangeHRM, designed to blend seamlessly with your HRMS system's theme and functionality.

## Features

### 🔍 Search & Filter
- **Employee Name Search**: Real-time search by first name, last name, or full name
- **Department Filter**: Filter employees by department
- **Position Filter**: Filter by job title/position
- **Status Filter**: Filter by employment status (Regular, Probationary, Part Time, etc.)
- **Reset Functionality**: Clear all filters with one click

### 👥 Employee Display
- **Card-based Layout**: Clean, modern card design showing employee photos and basic info
- **Responsive Grid**: Adapts to different screen sizes (1-5 columns based on viewport)
- **Photo Support**: Displays employee photos with fallback to default avatar
- **Hover Effects**: Interactive cards with smooth transitions

### 📋 Profile Modal
- **Detailed Information**: Complete employee profile with contact and employment details
- **Contact Information**: Email and phone number display
- **Employment Details**: Status, hire date, and position information
- **Quick Actions**: Direct email, call, and messaging capabilities

### 👨‍💼 Admin Controls
- **Role-based Access**: Admin-only features for employee management
- **Status Updates**: Change employee employment status (Regular, Probationary, etc.)
- **Account Management**: Activate/deactivate employee accounts
- **Secure Operations**: All admin actions require proper authentication

### 📱 Responsive Design
- **Mobile-friendly**: Optimized for all device sizes
- **Touch-friendly**: Large touch targets for mobile interaction
- **Adaptive Layout**: Grid adjusts based on screen size

### ⚡ Performance
- **Optimized Loading**: Efficient data fetching with pagination support
- **API Integration**: Dedicated API endpoint for directory operations
- **Error Handling**: Graceful error handling with user-friendly messages

## Technical Implementation

### API Endpoints
- `GET /api/directory` - Fetch directory data with filtering and pagination
- `PUT /api/directory` - Admin actions for updating employee records

### Data Sources
- **Employee Table**: Main employee records
- **Faculty Table**: Faculty-specific records
- **User Table**: User authentication and status
- **Department Table**: Department information
- **EmploymentDetail Table**: Employment status and details

### Security
- **Authentication**: Clerk-based user authentication
- **Authorization**: Role-based access control for admin features
- **Data Protection**: Secure API endpoints with proper validation

## Usage

### For Regular Users
1. Navigate to the Directory module
2. Use search and filter options to find employees
3. Click on employee cards to view detailed profiles
4. Use quick contact actions (email, call, message)

### For Administrators
1. Access all regular user features
2. View employee profiles with admin controls
3. Update employee status and account settings
4. Manage employee records as needed

## Styling
- **Color Scheme**: Uses your system's maroon theme (#800000)
- **Typography**: Clean, readable fonts with proper hierarchy
- **Icons**: FontAwesome icons for consistent visual language
- **Animations**: Smooth transitions and hover effects

## Future Enhancements
- Bulk operations for admin users
- Advanced search with multiple criteria
- Export functionality for directory data
- Integration with messaging system
- Photo upload functionality
- Advanced filtering options
