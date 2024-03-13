import { Client } from '@elastic/elasticsearch';
import * as fs from 'fs';
import { Analytics } from '../utils/constants';

export class ElasticDatabase {
    private client: Client | undefined;

    constructor() {
        this.client = this.connect();
    }

    public connect = () => {
        try {
            return new Client({
                node: 'https://localhost:9200',
                auth: {
                    apiKey: "TDRGU0U0NEIxRnowOFpFaFJLRnk6R3FZRXFsZVRRdm1YNWI4eXpXYTQxdw=="
                },
                tls: {
                    ca: fs.readFileSync('/tmp/http_ca.crt'),
                    rejectUnauthorized: false
                }
            });
        } catch (err: any) {
            console.log(err.message);
        }
    }

    public getClient = () => {
        return this.client;
    }

    createIndex = async () => {
        const isExists = await this.indexExists();
        if(!isExists){
            await this.client?.indices.create({ index: Analytics.INDEX_NAME });
        }
    }

    indexExists = async () => {
        return await this.client?.indices.exists({ index: Analytics.INDEX_NAME });
    }

    createDocument = async (document: any) => {
        return await this.client?.index({
            index: Analytics.INDEX_NAME,
            document
        })
    }
};
