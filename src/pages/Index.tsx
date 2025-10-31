import { useState } from "react";
import Header from "@/components/Header";
import UploadSection from "@/components/UploadSection";
import StatsCards from "@/components/StatsCards";
import JobsTable from "@/components/JobsTable";
import ActiveJobMonitor from "@/components/ActiveJobMonitor";

const Index = () => {
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

  const handleJobCreated = (jobId: string, projectId: string) => {
    setActiveJobId(jobId);
    setActiveProjectId(projectId);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-6 py-8 space-y-8">
        <StatsCards />
        
        {activeJobId && activeProjectId ? (
          <div className="space-y-8">
            <ActiveJobMonitor jobId={activeJobId} projectId={activeProjectId} />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1">
                <UploadSection onJobCreated={handleJobCreated} />
              </div>
              <div className="lg:col-span-2">
                <JobsTable />
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
              <UploadSection onJobCreated={handleJobCreated} />
            </div>
            <div className="lg:col-span-2">
              <JobsTable />
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
