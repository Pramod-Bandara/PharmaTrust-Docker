'use client';

import React, { useState, useEffect } from 'react';
import { apiClient, type CreateUserRequest, type UpdateUserRequest } from '@/lib/api-client';
import { User } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Users, 
  UserPlus, 
  Edit, 
  Trash2, 
  Key, 
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Eye,
  EyeOff
} from 'lucide-react';

interface UserManagementCardProps {
  onRefresh?: () => void;
}

const UserManagementCard = ({ onRefresh }: UserManagementCardProps) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [resetPassword, setResetPassword] = useState<{ username: string; password: string } | null>(null);
  
  const [createForm, setCreateForm] = useState<CreateUserRequest>({
    username: '',
    password: '',
    role: 'manufacturer',
    entityName: ''
  });

  const [updateForm, setUpdateForm] = useState<UpdateUserRequest>({});

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getUsers();
      if (response.success && response.data) {
        setUsers(response.data.users);
      } else {
        setError(response.error || 'Failed to fetch users');
      }
    } catch {
      setError('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.username || !createForm.password || !createForm.entityName) {
      setError('All fields are required');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccessMessage('');
      const response = await apiClient.createUser(createForm);
      if (response.success && response.data) {
        setUsers(prev => [...prev, response.data!.user]);
        setCreateForm({ username: '', password: '', role: 'manufacturer', entityName: '' });
        setShowCreateForm(false);
        setSuccessMessage(`User "${response.data.user.username}" created successfully!`);
        onRefresh?.();
        // Clear success message after 5 seconds
        setTimeout(() => setSuccessMessage(''), 5000);
      } else {
        setError(response.error || 'Failed to create user');
      }
    } catch {
      setError('Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      setLoading(true);
      setError('');
      setSuccessMessage('');
      const response = await apiClient.updateUser(editingUser.username, updateForm);
      if (response.success && response.data) {
        setUsers(prev => prev.map(u => 
          u.username === editingUser.username ? response.data!.user : u
        ));
        setEditingUser(null);
        setUpdateForm({});
        setSuccessMessage(`User "${editingUser.username}" updated successfully!`);
        onRefresh?.();
        // Clear success message after 5 seconds
        setTimeout(() => setSuccessMessage(''), 5000);
      } else {
        setError(response.error || 'Failed to update user');
      }
    } catch {
      setError('Failed to update user');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (username: string) => {
    try {
      setLoading(true);
      const response = await apiClient.resetUserPassword(username);
      if (response.success && response.data) {
        setResetPassword(response.data!);
        setError('');
      } else {
        setError(response.error || 'Failed to reset password');
      }
    } catch {
      setError('Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (username: string) => {
    if (!confirm(`Are you sure you want to delete user "${username}"?`)) return;

    try {
      setLoading(true);
      setError('');
      setSuccessMessage('');
      const response = await apiClient.deleteUser(username);
      if (response.success) {
        setUsers(prev => prev.filter(u => u.username !== username));
        setSuccessMessage(`User "${username}" deleted successfully!`);
        onRefresh?.();
        // Clear success message after 5 seconds
        setTimeout(() => setSuccessMessage(''), 5000);
      } else {
        setError(response.error || 'Failed to delete user');
      }
    } catch {
      setError('Failed to delete user');
    } finally {
      setLoading(false);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'manufacturer': return 'bg-blue-100 text-blue-800';
      case 'supplier': return 'bg-purple-100 text-purple-800';
      case 'pharmacist': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>User Management</span>
          </div>
          <div className="flex items-center space-x-2">
            <Button onClick={fetchUsers} disabled={loading} size="sm" variant="outline">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button onClick={() => setShowCreateForm(true)} size="sm">
              <UserPlus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          </div>
        </CardTitle>
        <CardDescription>
          Manage system users and their roles
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {successMessage && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              {successMessage}
            </AlertDescription>
          </Alert>
        )}

        {resetPassword && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              <strong>Password Reset Successful</strong><br />
              Username: {resetPassword.username}<br />
              New Password: <code className="bg-white px-1 rounded">{resetPassword.password}</code>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setResetPassword(null)}
                className="ml-2"
              >
                <EyeOff className="h-3 w-3" />
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Create User Form */}
        {showCreateForm && (
          <Card className="border-blue-200">
            <CardHeader>
              <CardTitle className="text-lg">Create New User</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Username</label>
                    <Input
                      value={createForm.username}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, username: e.target.value }))}
                      placeholder="Enter username"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Password</label>
                    <Input
                      type="password"
                      value={createForm.password}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, password: e.target.value }))}
                      placeholder="Enter password"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Role</label>
                    <select
                      value={createForm.role}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, role: e.target.value as User['role'] }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="manufacturer">Manufacturer</option>
                      <option value="supplier">Supplier</option>
                      <option value="pharmacist">Pharmacist</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Entity Name</label>
                    <Input
                      value={createForm.entityName}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, entityName: e.target.value }))}
                      placeholder="Enter entity name"
                      required
                    />
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button type="submit" disabled={loading}>
                    Create User
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setShowCreateForm(false);
                      setCreateForm({ username: '', password: '', role: 'manufacturer', entityName: '' });
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Edit User Form */}
        {editingUser && (
          <Card className="border-orange-200">
            <CardHeader>
              <CardTitle className="text-lg">Edit User: {editingUser.username}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateUser} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Role</label>
                    <select
                      value={updateForm.role || editingUser.role}
                      onChange={(e) => setUpdateForm(prev => ({ ...prev, role: e.target.value as User['role'] }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="manufacturer">Manufacturer</option>
                      <option value="supplier">Supplier</option>
                      <option value="pharmacist">Pharmacist</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Entity Name</label>
                    <Input
                      value={updateForm.entityName || editingUser.entityName}
                      onChange={(e) => setUpdateForm(prev => ({ ...prev, entityName: e.target.value }))}
                      placeholder="Enter entity name"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">New Password (optional)</label>
                  <Input
                    type="password"
                    value={updateForm.password || ''}
                    onChange={(e) => setUpdateForm(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="Leave blank to keep current password"
                  />
                </div>
                <div className="flex space-x-2">
                  <Button type="submit" disabled={loading}>
                    Update User
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setEditingUser(null);
                      setUpdateForm({});
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Users List */}
        <div className="space-y-2">
          {loading && users.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-2 text-gray-400" />
              <p>No users available</p>
            </div>
          ) : (
            users.map((user) => (
              <div key={user.username} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="font-semibold">{user.username}</h3>
                      <Badge className={getRoleColor(user.role)}>
                        {user.role.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600">{user.entityName}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingUser(user);
                        setUpdateForm({
                          role: user.role,
                          entityName: user.entityName
                        });
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleResetPassword(user.username)}
                      disabled={loading}
                    >
                      <Key className="h-4 w-4" />
                    </Button>
                    {user.username !== 'admin' && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteUser(user.username)}
                        disabled={loading}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Summary */}
        {users.length > 0 && (
          <div className="border-t pt-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-lg font-bold text-blue-600">
                  {users.length}
                </div>
                <div className="text-xs text-gray-600">Total Users</div>
              </div>
              <div>
                <div className="text-lg font-bold text-red-600">
                  {users.filter(u => u.role === 'admin').length}
                </div>
                <div className="text-xs text-gray-600">Admins</div>
              </div>
              <div>
                <div className="text-lg font-bold text-purple-600">
                  {users.filter(u => u.role === 'manufacturer').length}
                </div>
                <div className="text-xs text-gray-600">Manufacturers</div>
              </div>
              <div>
                <div className="text-lg font-bold text-orange-600">
                  {users.filter(u => ['supplier', 'pharmacist'].includes(u.role)).length}
                </div>
                <div className="text-xs text-gray-600">Supply Chain</div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default UserManagementCard;
