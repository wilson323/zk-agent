import React from "react"
import { CheckCircle, XCircle, RefreshCw, Clock } from "lucide-react"

export const getSeverityColor = (severity: string): "destructive" | "default" | "secondary" | "outline" => {
  switch (severity) {
    case 'critical': return 'destructive';
    case 'high': return 'destructive';
    case 'medium': return 'default';
    case 'low': return 'secondary';
    case 'info': return 'outline';
    default: return 'secondary';
  }
};

export const getStatusIcon = (status: string): React.ReactElement => {
  switch (status) {
    case 'completed': return <CheckCircle className="h-4 w-4 text-green-600" />;
    case 'failed': return <XCircle className="h-4 w-4 text-red-600" />;
    case 'running': return <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />;
    case 'queued': return <Clock className="h-4 w-4 text-yellow-600" />;
    default: return <Clock className="h-4 w-4 text-gray-600" />;
  }
};

export const formatDuration = (ms: number): string => {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {return `${hours}h ${minutes % 60}m`;}
  if (minutes > 0) {return `${minutes}m ${seconds % 60}s`;}
  return `${seconds}s`;
};