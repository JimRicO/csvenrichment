import Header from "@/components/Header";
import UploadSection from "@/components/UploadSection";
import StatsCards from "@/components/StatsCards";
import JobsTable from "@/components/JobsTable";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-6 py-8 space-y-8">
        <StatsCards />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <UploadSection />
          </div>
          <div className="lg:col-span-2">
            <JobsTable />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
