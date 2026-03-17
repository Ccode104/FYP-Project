import { apiFetch } from '../../../services/api';

export interface SupportTicket {
  id: number;
  user_id: number;
  title: string;
  description: string;
  category: 'bug_report' | 'technical_issue' | 'feature_request' | 'other';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assigned_to?: number;
  course_offering_id?: number;
  created_at: string;
  updated_at: string;
  user_name: string;
  user_email: string;
  course_code?: string;
  course_title?: string;
  assigned_to_name?: string;
}

export interface TicketComment {
  id: number;
  ticket_id: number;
  user_id: number;
  comment: string;
  is_internal: boolean;
  created_at: string;
  commenter_name: string;
  commenter_email: string;
}

export interface TicketAttachment {
  id: number;
  ticket_id: number;
  file_path: string;
  filename: string;
  mime_type?: string;
  uploaded_by: number;
  uploaded_at: string;
  uploader_name: string;
}

export interface TicketDetails extends SupportTicket {
  comments: TicketComment[];
  attachments: TicketAttachment[];
}

export async function createTicket(data: {
  title: string;
  description: string;
  category: SupportTicket['category'];
  priority?: SupportTicket['priority'];
  course_offering_id?: number;
}): Promise<{ ticket: SupportTicket; message: string }> {
  return apiFetch('/api/support/tickets', {
    method: 'POST',
    body: data,
  });
}

export async function getUserTickets(params?: {
  status?: SupportTicket['status'];
  category?: SupportTicket['category'];
}): Promise<{ tickets: SupportTicket[] }> {
  const queryParams = new URLSearchParams();
  if (params?.status) queryParams.append('status', params.status);
  if (params?.category) queryParams.append('category', params.category);

  const query = queryParams.toString();
  return apiFetch(`/api/support/tickets${query ? `?${query}` : ''}`);
}

export async function getAllTickets(params?: {
  status?: SupportTicket['status'];
  category?: SupportTicket['category'];
  assigned_to?: number;
  priority?: SupportTicket['priority'];
}): Promise<{ tickets: SupportTicket[] }> {
  const queryParams = new URLSearchParams();
  if (params?.status) queryParams.append('status', params.status);
  if (params?.category) queryParams.append('category', params.category);
  if (params?.assigned_to) queryParams.append('assigned_to', params.assigned_to.toString());
  if (params?.priority) queryParams.append('priority', params.priority);

  const query = queryParams.toString();
  return apiFetch(`/api/support/admin/tickets${query ? `?${query}` : ''}`);
}

export async function getTicketDetails(id: number): Promise<TicketDetails> {
  return apiFetch(`/api/support/tickets/${id}`);
}

export async function updateTicketStatus(
  id: number,
  data: {
    status?: SupportTicket['status'];
    assigned_to?: number;
    priority?: SupportTicket['priority'];
  },
): Promise<{ ticket: SupportTicket; message: string }> {
  return apiFetch(`/api/support/tickets/${id}/status`, {
    method: 'PUT',
    body: data,
  });
}

export async function addTicketComment(
  id: number,
  data: {
    comment: string;
    is_internal?: boolean;
  },
): Promise<{ comment: TicketComment; message: string }> {
  return apiFetch(`/api/support/tickets/${id}/comments`, {
    method: 'POST',
    body: data,
  });
}

export async function deleteTicket(id: number): Promise<{ message: string }> {
  return apiFetch(`/api/support/tickets/${id}`, {
    method: 'DELETE',
  });
}

