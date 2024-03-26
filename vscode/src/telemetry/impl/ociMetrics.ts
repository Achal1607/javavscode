import * as loggingingestion from "oci-loggingingestion";
import common = require("oci-common");
import { TelemetryEvent } from "../types";
import { randomUUID } from "crypto";

const provider: common.SessionAuthDetailProvider = new common.SessionAuthDetailProvider();

export const postTelemetry = async (event: TelemetryEvent) => {
    try {
        // Create a service client
        const client = new loggingingestion.LoggingClient({ authenticationDetailsProvider: provider });
 
        // Create a request and dependent object(s).
        const putLogsDetails = {
            specversion: "1.0",
            logEntryBatches: [
                {
                    entries: [
                        {
                            data: JSON.stringify(event.data),
                            id: randomUUID()
                        }
                    ],
                    source: "vscode",
                    type: event.type,
                    defaultlogentrytime: new Date()
                }
            ]
        };
        
        
        const putLogsRequest: loggingingestion.requests.PutLogsRequest = {
            logId: "ocid1.log.oc1.iad.amaaaaaafhbuohya6kivgaaigyumb3hszojfnt3ysk7lyagb2ylr3sygidvq",
            putLogsDetails: putLogsDetails,
        };

        // Send request to the Client.
        const putLogsResponse = await client.putLogs(putLogsRequest);
        return putLogsResponse;
    } catch (error) {
        console.log("putLogs Failed with error  " + error);
    }
}