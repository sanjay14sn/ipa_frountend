import { useState } from "react";
import FranchiseTableHeader from "./FranchiseTableHeader";
import FranchiseRow from "./FranchiseRow";
import { mockClients } from "./mockData";
import { Client } from "./types";

export default function CardComponent() {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [expandedChildren, setExpandedChildren] = useState<Set<string>>(
    new Set()
  );
  const [clients, setClients] = useState<Client[]>(mockClients);

  const toggleRow = (id: string) => {
    // Check if this is a child expansion (contains a hyphen)
    if (id.includes("-")) {
      // Handle child expansion
      const newExpandedChildren = new Set(expandedChildren);
      if (newExpandedChildren.has(id)) {
        newExpandedChildren.delete(id);
      } else {
        newExpandedChildren.add(id);
      }
      setExpandedChildren(newExpandedChildren);
    } else {
      // Handle parent row expansion
      // If clicking the same row that's already expanded, close it
      if (expandedRow === id) {
        setExpandedRow(null);
        // Also clear any child expansions when closing parent
        setExpandedChildren(new Set());
      } else {
        // Otherwise, open the clicked row (this automatically closes any other open row)
        setExpandedRow(id);
        // Clear child expansions when switching to a different parent
        setExpandedChildren(new Set());
      }
    }
  };

  const handleClientUpdate = (updatedClient: Client) => {
    setClients((prevClients) =>
      prevClients.map((client) =>
        client.id === updatedClient.id ? updatedClient : client
      )
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-primary/80">
      <div className="p-1">
        <FranchiseTableHeader />
      </div>
      {clients.map((client, index) => (
        <FranchiseRow
          key={client.id}
          lastRow={index === clients.length - 1}
          client={client}
          isExpanded={expandedRow === client.id.toString()}
          expandedRows={expandedChildren}
          onToggleRow={toggleRow}
          onClientUpdate={handleClientUpdate}
        />
      ))}
    </div>
  );
}
