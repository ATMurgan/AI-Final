import Header from "@/components/Header";
import ClientApp from "@/components/ClientApp";

export default function Home() {
  return (
    <div className="flex flex-col h-full bg-dawn-950">
      <Header />
      <ClientApp />
    </div>
  );
}
