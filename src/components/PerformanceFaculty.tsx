//Performance Employee

import React, { useState } from 'react';
import { 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  MessageCircle,
  Star,
  FileText,
  Bell,
  Calendar,
  BarChart3
} from 'lucide-react';

const PerformanceFaculty: React.FC = () => {
  const [activeTab, setActiveTab] = useState('tasks');
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [newComment, setNewComment] = useState('');

  // Mock data for employee view
  const mockMyTasks = [
    {
      id: 1,
      title: "Complete Q1 Performance Review",
      status: "InProgress",
      priority: "High",
      dueDate: "2024-01-15",
      assignedDate: "2024-01-01",
      progress: 75,
      description: "Complete your quarterly performance review including self-assessment and goal updates.",
      assignedBy: "HR Manager"
    },
    {
      id: 2,
      title: "Update Skills Database",
      status: "Pending",
      priority: "Medium",
      dueDate: "2024-01-20",
      assignedDate: "2024-01-05",
      progress: 0,
      description: "Update your skills and certifications in the employee database.",
      assignedBy: "IT Manager"
    },
    {
      id: 3,
      title: "Attend Team Training Session",
      status: "Completed",
      priority: "High",
      dueDate: "2024-01-10",
      assignedDate: "2023-12-20",
      progress: 100,
      description: "Attend the mandatory team training session on new procedures.",
      assignedBy: "Department Head"
    }
  ];

  const mockNotifications = [
    {
      id: 1,
      type: "TaskAssigned",
      title: "New Task Assigned",
      message: "You have been assigned a new task: Complete Q1 Performance Review",
      date: "2024-01-01",
      isRead: false
    },
    {
      id: 2,
      type: "TaskDue",
      title: "Task Due Soon",
      message: "Your task 'Update Skills Database' is due in 2 days",
      date: "2024-01-18",
      isRead: false
    },
    {
      id: 3,
      type: "EvaluationRequested",
      title: "Evaluation Requested",
      message: "Your manager has requested a performance evaluation",
      date: "2024-01-12",
      isRead: true
    }
  ];

  const mockPerformanceData = {
    overallRating: 4.2,
    completedTasks: 12,
    inProgressTasks: 3,
    overdueTasks: 1,
    monthlyGoal: 85,
    currentStreak: 5
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed': return 'bg-green-100 text-green-800';
      case 'InProgress': return 'bg-blue-100 text-blue-800';
      case 'Pending': return 'bg-yellow-100 text-yellow-800';
      case 'Overdue': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Critical': return 'bg-red-100 text-red-800';
      case 'High': return 'bg-orange-100 text-orange-800';
      case 'Medium': return 'bg-yellow-100 text-yellow-800';
      case 'Low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Completed': return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'InProgress': return <Clock className="h-5 w-5 text-blue-600" />;
      case 'Pending': return <Clock className="h-5 w-5 text-yellow-600" />;
      case 'Overdue': return <AlertTriangle className="h-5 w-5 text-red-600" />;
      default: return <Clock className="h-5 w-5 text-gray-600" />;
    }
  };

  const handleTaskUpdate = (taskId: number, newStatus: string) => {
    // In a real app, this would make an API call
    console.log(`Updating task ${taskId} to ${newStatus}`);
  };

  const handleAddComment = () => {
    if (newComment.trim() && selectedTask) {
      // In a real app, this would make an API call
      console.log(`Adding comment to task ${selectedTask.id}: ${newComment}`);
      setNewComment('');
      setShowCommentModal(false);
      setSelectedTask(null);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Performance</h1>
          <p className="text-gray-600">Track your tasks, goals, and performance metrics</p>
        </div>
        <div className="flex items-center space-x-2">
          <Bell className="h-6 w-6 text-gray-400" />
          <span className="text-sm text-gray-600">
            {mockNotifications.filter(n => !n.isRead).length} unread notifications
          </span>
        </div>
      </div>

      {/* Performance Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Star className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Overall Rating</p>
              <p className="text-2xl font-bold text-gray-900">{mockPerformanceData.overallRating}/5.0</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Completed Tasks</p>
              <p className="text-2xl font-bold text-gray-900">{mockPerformanceData.completedTasks}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">In Progress</p>
              <p className="text-2xl font-bold text-gray-900">{mockPerformanceData.inProgressTasks}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <BarChart3 className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Goal Progress</p>
              <p className="text-2xl font-bold text-gray-900">{mockPerformanceData.monthlyGoal}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'tasks', name: 'My Tasks', count: mockMyTasks.length },
            { id: 'notifications', name: 'Notifications', count: mockNotifications.filter(n => !n.isRead).length },
            { id: 'reports', name: 'My Reports', count: 3 },
            { id: 'goals', name: 'Goals & Objectives', count: 5 }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.name}
              {tab.count > 0 && (
                <span className={`ml-2 py-0.5 px-2 rounded-full text-xs ${
                  activeTab === tab.id ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* My Tasks Tab */}
      {activeTab === 'tasks' && (
        <div className="space-y-6">
          <div className="grid gap-6">
            {mockMyTasks.map((task) => (
              <div key={task.id} className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      {getStatusIcon(task.status)}
                      <h3 className="text-lg font-semibold text-gray-900">{task.title}</h3>
                    </div>
                    <p className="text-gray-600 mb-4">{task.description}</p>
                    <div className="flex items-center space-x-4 text-sm text-gray-600 mb-4">
                      <span><strong>Assigned by:</strong> {task.assignedBy}</span>
                      <span><strong>Due:</strong> {new Date(task.dueDate).toLocaleDateString()}</span>
                      <span><strong>Assigned:</strong> {new Date(task.assignedDate).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center space-x-4 mb-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                        {task.status}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                        {task.priority} Priority
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${task.progress}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Progress: {task.progress}%</span>
                      <span>{task.progress === 100 ? 'Completed' : 'In Progress'}</span>
                    </div>
                  </div>
                  <div className="flex flex-col space-y-2 ml-4">
                    {task.status !== 'Completed' && (
                      <button 
                        onClick={() => handleTaskUpdate(task.id, 'Completed')}
                        className="px-3 py-1 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
                      >
                        Mark Complete
                      </button>
                    )}
                    <button 
                      onClick={() => {
                        setSelectedTask(task);
                        setShowCommentModal(true);
                      }}
                      className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 flex items-center space-x-1"
                    >
                      <MessageCircle className="h-4 w-4" />
                      <span>Comment</span>
                    </button>
                    {task.status === 'Pending' && (
                      <button 
                        onClick={() => handleTaskUpdate(task.id, 'InProgress')}
                        className="px-3 py-1 bg-yellow-600 text-white text-sm rounded-lg hover:bg-yellow-700"
                      >
                        Start Task
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <div className="space-y-4">
          {mockNotifications.map((notification) => (
            <div key={notification.id} className={`bg-white rounded-lg shadow-sm border p-4 ${
              !notification.isRead ? 'border-l-4 border-l-blue-500' : ''
            }`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <h4 className="font-medium text-gray-900">{notification.title}</h4>
                    {!notification.isRead && (
                      <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                    )}
                  </div>
                  <p className="text-gray-600 text-sm mb-2">{notification.message}</p>
                  <div className="flex items-center space-x-2 text-xs text-gray-500">
                    <Calendar className="h-4 w-4" />
                    <span>{new Date(notification.date).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    notification.type === 'TaskAssigned' ? 'bg-blue-100 text-blue-800' :
                    notification.type === 'TaskDue' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {notification.type.replace(/([A-Z])/g, ' $1').trim()}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* My Reports Tab */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold mb-4">My Performance Reports</h3>
            <div className="space-y-4">
              {[
                { period: 'Q1 2024', rating: 4.2, status: 'Completed', date: '2024-01-15' },
                { period: 'Q4 2023', rating: 4.0, status: 'Completed', date: '2023-12-15' },
                { period: 'Q3 2023', rating: 3.8, status: 'Completed', date: '2023-09-15' }
              ].map((report, index) => (
                <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <FileText className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">{report.period} Performance Report</h4>
                      <p className="text-sm text-gray-600">Completed on {new Date(report.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900">{report.rating}</div>
                      <div className="text-sm text-gray-600">Rating</div>
                    </div>
                    <div className="text-center">
                      <div className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {report.status}
                      </div>
                    </div>
                    <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                      View Report
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Goals & Objectives Tab */}
      {activeTab === 'goals' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold mb-4">My Goals & Objectives</h3>
            <div className="space-y-4">
              {[
                { goal: 'Complete 5 training courses', progress: 80, target: '5 courses', achieved: false },
                { goal: 'Improve customer satisfaction rating', progress: 90, target: '4.5/5.0', achieved: false },
                { goal: 'Lead 3 team projects', progress: 100, target: '3 projects', achieved: true },
                { goal: 'Reduce response time by 20%', progress: 60, target: '20% reduction', achieved: false },
                { goal: 'Mentor 2 junior employees', progress: 100, target: '2 employees', achieved: true }
              ].map((goal, index) => (
                <div key={index} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900">{goal.goal}</h4>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      goal.achieved ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {goal.achieved ? 'Achieved' : 'In Progress'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-4 mb-2">
                    <span className="text-sm text-gray-600">Target: {goal.target}</span>
                    <span className="text-sm text-gray-600">Progress: {goal.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        goal.achieved ? 'bg-green-600' : 'bg-blue-600'
                      }`}
                      style={{ width: `${goal.progress}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Comment Modal */}
      {showCommentModal && selectedTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Add Comment to Task</h3>
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">Task: {selectedTask.title}</p>
              <textarea
                rows={4}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Add your comment or update..."
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowCommentModal(false);
                  setSelectedTask(null);
                  setNewComment('');
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleAddComment}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Add Comment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PerformanceFaculty;