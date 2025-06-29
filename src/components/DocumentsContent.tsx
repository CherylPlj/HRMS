'use client';

import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import EmployeeListTab from './tabs/EmployeeListTab';
import EmployeeDocumentsTab from './tabs/EmployeeDocumentsTab';

interface Employee {
  EmployeeID: string;
  FirstName: string;
  LastName: string;
  Email: string;
  DepartmentID: number;
  Department?: { DepartmentID: number; DepartmentName: string };
  Position?: string;
  EmploymentStatus?: string;
  Photo?: string;
}

interface DocumentEmployeeRow {
  DocumentID: number;
  EmployeeID: string;
  DocumentTypeID: number;
  UploadDate: string;
  SubmissionStatus: string;
  employeeName: string;
  documentTypeName: string;
  FilePath?: string;
  FileUrl?: string;
  DownloadUrl?: string;
}

interface DocumentType {
  DocumentTypeID: number;
  DocumentTypeName: string;
  AllowedFileTypes: string[] | null;
  Template: string | null;
}

interface Department {
  DepartmentID: number;
  DepartmentName: string;
}

const DocumentsContent = () => {
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState<'employeeList' | 'documentRequirements'>('documentRequirements');
  const [employeeList, setEmployeeList] = useState<Employee[]>([]);
  const [documents, setDocuments] = useState<DocumentEmployeeRow[]>([]);
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch employees
  useEffect(() => {
    const fetchEmployees = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/employees?all=true');
        const data = await res.json();
        if (res.ok && Array.isArray(data.employees)) {
          setEmployeeList(data.employees);
        } else {
          setEmployeeList([]);
        }
      } catch (e) {
        setEmployeeList([]);
      } finally {
        setLoading(false);
      }
    };
    fetchEmployees();
  }, []);

  // Fetch documents
  useEffect(() => {
    const fetchAllDocuments = async () => {
      setLoading(true);
      try {
        // This assumes an endpoint that returns all employee documents
        const res = await fetch('/api/employee-documents?all=true');
        const data = await res.json();
        if (res.ok && Array.isArray(data)) {
          setDocuments(data);
        } else if (res.ok && Array.isArray(data.documents)) {
          setDocuments(data.documents);
        } else {
          setDocuments([]);
        }
      } catch (e) {
        setDocuments([]);
      } finally {
        setLoading(false);
      }
    };
    fetchAllDocuments();
  }, []);

  // Fetch document types
  useEffect(() => {
    const fetchDocumentTypes = async () => {
      try {
        const res = await fetch('/api/document-types');
        const data = await res.json();
        if (res.ok && Array.isArray(data)) {
          setDocumentTypes(data);
        } else {
          setDocumentTypes([]);
        }
      } catch (e) {
        setDocumentTypes([]);
      }
    };
    fetchDocumentTypes();
  }, []);

  // Fetch departments
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const res = await fetch('/api/departments');
        const data = await res.json();
        if (res.ok && Array.isArray(data)) {
          setDepartments(data);
        } else {
          setDepartments([]);
        }
      } catch (e) {
        setDepartments([]);
      }
    };
    fetchDepartments();
  }, []);

  return (
    <div className="p-6">
      <div className="flex space-x-4 mb-6">
      <button
          onClick={() => setActiveTab('documentRequirements')}
          className={`px-4 py-2 rounded ${activeTab === 'documentRequirements' ? 'bg-[#800000] text-white' : 'bg-gray-200 text-gray-700'}`}
        >
          Document Requirements
        </button>
        <button
          onClick={() => setActiveTab('employeeList')}
          className={`px-4 py-2 rounded ${activeTab === 'employeeList' ? 'bg-[#800000] text-white' : 'bg-gray-200 text-gray-700'}`}
        >
          Employee List
        </button>
        
      </div>
      {loading ? (
        <div className="text-center py-4">Loading...</div>
      ) : activeTab === 'employeeList' ? (
        <EmployeeListTab
          employees={employeeList}
          documents={documents}
          documentTypes={documentTypes}
          departments={departments}
        />
      ) : (
        <EmployeeDocumentsTab
          documents={documents}
          documentTypes={documentTypes}
          employees={employeeList}
        />
      )}
    </div>
  );
};

export default DocumentsContent; 