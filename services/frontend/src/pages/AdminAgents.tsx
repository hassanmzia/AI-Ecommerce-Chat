import { useState } from 'react';
import {
  Bot,
  Activity,
  Clock,
  CheckCircle2,
  AlertCircle,
  Zap,
  RefreshCw,
  BarChart3,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import clsx from 'clsx';
import AdminSidebar from '@/components/admin/AdminSidebar';
import type { AgentStatus } from '@/types';

const mockAgents: AgentStatus[] = [
  {
    id: 'agent-1',
    name: 'Order Management Agent',
    type: 'order_management',
    status: 'online',
    lastActive: '2024-01-15T14:30:00Z',
    tasksCompleted: 1245,
    tasksInProgress: 3,
    averageResponseTime: 1.2,
    successRate: 98.5,
  },
  {
    id: 'agent-2',
    name: 'Product Search Agent',
    type: 'product_search',
    status: 'online',
    lastActive: '2024-01-15T14:29:00Z',
    tasksCompleted: 3567,
    tasksInProgress: 8,
    averageResponseTime: 0.8,
    successRate: 99.1,
  },
  {
    id: 'agent-3',
    name: 'Customer Service Agent',
    type: 'customer_service',
    status: 'busy',
    lastActive: '2024-01-15T14:30:00Z',
    tasksCompleted: 2189,
    tasksInProgress: 12,
    averageResponseTime: 2.1,
    successRate: 96.8,
  },
  {
    id: 'agent-4',
    name: 'Payment Processing Agent',
    type: 'payment',
    status: 'online',
    lastActive: '2024-01-15T14:28:00Z',
    tasksCompleted: 987,
    tasksInProgress: 1,
    averageResponseTime: 0.5,
    successRate: 99.9,
  },
  {
    id: 'agent-5',
    name: 'Analytics Agent',
    type: 'analytics',
    status: 'online',
    lastActive: '2024-01-15T14:25:00Z',
    tasksCompleted: 456,
    tasksInProgress: 0,
    averageResponseTime: 3.5,
    successRate: 97.2,
  },
];

const performanceData = [
  { time: '00:00', requests: 12, responseTime: 1.1 },
  { time: '02:00', requests: 8, responseTime: 0.9 },
  { time: '04:00', requests: 5, responseTime: 0.8 },
  { time: '06:00', requests: 15, responseTime: 1.0 },
  { time: '08:00', requests: 45, responseTime: 1.3 },
  { time: '10:00', requests: 78, responseTime: 1.5 },
  { time: '12:00', requests: 92, responseTime: 1.8 },
  { time: '14:00', requests: 85, responseTime: 1.6 },
  { time: '16:00', requests: 67, responseTime: 1.4 },
  { time: '18:00', requests: 55, responseTime: 1.2 },
  { time: '20:00', requests: 38, responseTime: 1.1 },
  { time: '22:00', requests: 22, responseTime: 1.0 },
];

const executionHistory = [
  {
    id: 'exec-1',
    agent: 'Product Search Agent',
    task: 'Search: wireless headphones under $100',
    status: 'completed',
    duration: '0.8s',
    timestamp: '14:30:12',
  },
  {
    id: 'exec-2',
    agent: 'Order Management Agent',
    task: 'Track order #ORD-2847',
    status: 'completed',
    duration: '1.1s',
    timestamp: '14:29:45',
  },
  {
    id: 'exec-3',
    agent: 'Customer Service Agent',
    task: 'Return policy inquiry',
    status: 'running',
    duration: '2.3s',
    timestamp: '14:29:30',
  },
  {
    id: 'exec-4',
    agent: 'Payment Processing Agent',
    task: 'Process refund #REF-123',
    status: 'completed',
    duration: '0.5s',
    timestamp: '14:28:15',
  },
  {
    id: 'exec-5',
    agent: 'Product Search Agent',
    task: 'Recommendation: similar to Smart Watch',
    status: 'completed',
    duration: '1.4s',
    timestamp: '14:27:50',
  },
  {
    id: 'exec-6',
    agent: 'Analytics Agent',
    task: 'Generate daily sales report',
    status: 'error',
    duration: '5.2s',
    timestamp: '14:25:00',
  },
];

export default function AdminAgents() {
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
        return <div className="w-3 h-3 bg-emerald-500 rounded-full" />;
      case 'busy':
        return <div className="w-3 h-3 bg-amber-500 rounded-full animate-pulse" />;
      case 'offline':
        return <div className="w-3 h-3 bg-neutral-400 rounded-full" />;
      case 'error':
        return <div className="w-3 h-3 bg-red-500 rounded-full" />;
      default:
        return <div className="w-3 h-3 bg-neutral-400 rounded-full" />;
    }
  };

  const getAgentIcon = (type: string) => {
    switch (type) {
      case 'order_management':
        return 'bg-blue-500';
      case 'product_search':
        return 'bg-emerald-500';
      case 'customer_service':
        return 'bg-purple-500';
      case 'payment':
        return 'bg-amber-500';
      case 'analytics':
        return 'bg-cyan-500';
      default:
        return 'bg-neutral-500';
    }
  };

  return (
    <div className="flex">
      <AdminSidebar />
      <div className="flex-1 p-8 bg-neutral-50">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-neutral-900">
                AI Agents
              </h1>
              <p className="text-neutral-500 mt-1">
                Monitor and manage AI agent performance
              </p>
            </div>
            <button className="btn-secondary flex items-center gap-2 text-sm">
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>

          {/* Summary Stats */}
          <div className="grid sm:grid-cols-4 gap-4 mb-8">
            <div className="card p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                <Bot className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xl font-bold text-neutral-900">
                  {mockAgents.filter((a) => a.status === 'online').length}/
                  {mockAgents.length}
                </p>
                <p className="text-xs text-neutral-500">Agents Online</p>
              </div>
            </div>
            <div className="card p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xl font-bold text-neutral-900">
                  {mockAgents.reduce((sum, a) => sum + a.tasksCompleted, 0).toLocaleString()}
                </p>
                <p className="text-xs text-neutral-500">Tasks Completed</p>
              </div>
            </div>
            <div className="card p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
                <Clock className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xl font-bold text-neutral-900">
                  {(
                    mockAgents.reduce(
                      (sum, a) => sum + a.averageResponseTime,
                      0
                    ) / mockAgents.length
                  ).toFixed(1)}
                  s
                </p>
                <p className="text-xs text-neutral-500">Avg Response Time</p>
              </div>
            </div>
            <div className="card p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
                <Zap className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xl font-bold text-neutral-900">
                  {(
                    mockAgents.reduce((sum, a) => sum + a.successRate, 0) /
                    mockAgents.length
                  ).toFixed(1)}
                  %
                </p>
                <p className="text-xs text-neutral-500">Success Rate</p>
              </div>
            </div>
          </div>

          {/* Agent Cards */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {mockAgents.map((agent) => (
              <div
                key={agent.id}
                onClick={() =>
                  setSelectedAgent(
                    selectedAgent === agent.id ? null : agent.id
                  )
                }
                className={clsx(
                  'card p-5 cursor-pointer transition-all',
                  selectedAgent === agent.id
                    ? 'ring-2 ring-primary-500 shadow-lg'
                    : 'hover:shadow-card-hover'
                )}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 ${getAgentIcon(
                        agent.type
                      )} rounded-xl flex items-center justify-center`}
                    >
                      <Bot className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-neutral-800">
                        {agent.name}
                      </p>
                      <p className="text-xs text-neutral-500 capitalize">
                        {agent.type.replace(/_/g, ' ')}
                      </p>
                    </div>
                  </div>
                  {getStatusIcon(agent.status)}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-neutral-500">Completed</p>
                    <p className="text-sm font-semibold text-neutral-800">
                      {agent.tasksCompleted.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-neutral-500">In Progress</p>
                    <p className="text-sm font-semibold text-neutral-800">
                      {agent.tasksInProgress}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-neutral-500">Avg Response</p>
                    <p className="text-sm font-semibold text-neutral-800">
                      {agent.averageResponseTime}s
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-neutral-500">Success Rate</p>
                    <p
                      className={clsx(
                        'text-sm font-semibold',
                        agent.successRate >= 99
                          ? 'text-emerald-600'
                          : agent.successRate >= 97
                          ? 'text-blue-600'
                          : 'text-amber-600'
                      )}
                    >
                      {agent.successRate}%
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Performance Chart */}
          <div className="card p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-neutral-800">
                Agent Performance (24h)
              </h2>
              <div className="flex items-center gap-1">
                <BarChart3 className="w-4 h-4 text-neutral-400" />
                <span className="text-xs text-neutral-500">
                  Requests per hour
                </span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="time" stroke="#9ca3af" fontSize={12} />
                <YAxis stroke="#9ca3af" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    borderRadius: '12px',
                    border: '1px solid #e5e7eb',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="requests"
                  stroke="#3b82f6"
                  fill="url(#colorRequests)"
                  strokeWidth={2}
                  name="Requests"
                />
                <defs>
                  <linearGradient
                    id="colorRequests"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor="#3b82f6"
                      stopOpacity={0.2}
                    />
                    <stop
                      offset="95%"
                      stopColor="#3b82f6"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Execution History */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-neutral-800">
                Recent Executions
              </h2>
              <Activity className="w-4 h-4 text-neutral-400" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-neutral-200">
                    <th className="text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider pb-3">
                      Time
                    </th>
                    <th className="text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider pb-3">
                      Agent
                    </th>
                    <th className="text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider pb-3">
                      Task
                    </th>
                    <th className="text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider pb-3">
                      Duration
                    </th>
                    <th className="text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider pb-3">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {executionHistory.map((exec) => (
                    <tr key={exec.id} className="hover:bg-neutral-50">
                      <td className="py-3 text-sm text-neutral-500 font-mono">
                        {exec.timestamp}
                      </td>
                      <td className="py-3 text-sm font-medium text-neutral-700">
                        {exec.agent}
                      </td>
                      <td className="py-3 text-sm text-neutral-600 max-w-[250px] truncate">
                        {exec.task}
                      </td>
                      <td className="py-3 text-sm text-neutral-600 font-mono">
                        {exec.duration}
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-1.5">
                          {exec.status === 'completed' && (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          )}
                          {exec.status === 'running' && (
                            <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />
                          )}
                          {exec.status === 'error' && (
                            <AlertCircle className="w-4 h-4 text-red-500" />
                          )}
                          <span
                            className={clsx(
                              'text-xs font-medium capitalize',
                              exec.status === 'completed' &&
                                'text-emerald-600',
                              exec.status === 'running' && 'text-blue-600',
                              exec.status === 'error' && 'text-red-600'
                            )}
                          >
                            {exec.status}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
