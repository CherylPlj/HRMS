import React from 'react';
import Image from 'next/image';
import { User, Eye } from 'lucide-react';
import { LeaveStatus } from '@prisma/client';
import type { TransformedLeave } from './types';
import { formatDate, formatRequestType, calculateDuration } from './utils';

interface LeaveLogsTableProps {
    leaves: TransformedLeave[];
    profilePhotos: Record<string, string>;
    onView: (leave: TransformedLeave) => void;
}

const LeaveLogsTable: React.FC<LeaveLogsTableProps> = ({
    leaves,
    profilePhotos,
    onView
}) => {
    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Employee
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Request Type
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Start Date
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                End Date
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Duration
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Date Submitted
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Status
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {leaves.length > 0 ? (
                            leaves.map((leave) => (
                                <tr key={leave.LeaveID} className="hover:bg-gray-50 transition-colors duration-200">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="flex-shrink-0 h-10 w-10">
                                                {leave.Faculty?.UserID && profilePhotos[leave.Faculty.UserID] ? (
                                                    <Image
                                                        src={profilePhotos[leave.Faculty.UserID]}
                                                        alt={leave.Faculty.Name}
                                                        width={40}
                                                        height={40}
                                                        className="rounded-full"
                                                        onError={(e) => {
                                                            const target = e.target as HTMLImageElement;
                                                            target.src = '/manprofileavatar.png';
                                                        }}
                                                    />
                                                ) : (
                                                    <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                                                        <User className="h-6 w-6 text-gray-400" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="ml-4">
                                                <div className="text-sm font-medium text-gray-900">
                                                    {leave.Faculty?.Name}
                                                </div>
                                                <div className="text-sm text-gray-500">
                                                    {leave.Faculty?.Department}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {formatRequestType(leave.RequestType, leave.LeaveType)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {formatDate(leave.StartDate)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {formatDate(leave.EndDate)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {calculateDuration(leave.StartDate, leave.EndDate)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {formatDate(leave.CreatedAt)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                            leave.Status === LeaveStatus.Approved 
                                                ? 'bg-green-100 text-green-800'
                                                : 'bg-red-100 text-red-800'
                                        }`}>
                                            {leave.Status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <button
                                            onClick={() => onView(leave)}
                                            className="p-1.5 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded transition-colors"
                                            title="View details"
                                        >
                                            <Eye className="h-5 w-5" />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={8} className="text-center text-gray-400 py-12">
                                    No Leave Logs Found
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default LeaveLogsTable;

