import {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
  NodeOperationError,
} from 'n8n-workflow';
import { Client } from 'ads-client';

async function createAdsClient(
  localAmsNetId: string,
  targetAmsNetId: string,
  targetAdsPort: number,
  routerAddress: string,
): Promise<Client> {

  // First, try local router (assumes TwinCAT router is installed on this machine)
  try {
    const client = new Client({
      localAmsNetId,
      targetAmsNetId,
      targetAdsPort,
      timeoutDelay: 1000, // fail faster so fallback kicks in sooner
    });
    await client.connect();
    return client;

  } catch (localErr) {
    console.log('Local router failed, trying direct connection...', localErr.message);
  }

  // Fallback: connect directly to PLC router (no local TwinCAT installed)
  try {
    const client = new Client({
      localAmsNetId,
      localAdsPort: 32750,
      targetAmsNetId,
      targetAdsPort,
      routerAddress,
      routerTcpPort: 48898,
    });
    await client.connect();
    return client;

  } catch (directErr) {
    throw new Error(`Both connection methods failed. Direct error: ${directErr.message}`);
  }
}

export class TwinCatAds implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'TwinCAT ADS',
    name: 'twinCatAds',
    icon: { light: 'file:tc1xxx.png', dark: 'file:tc1xxx.png' },
    group: ['transform'],
    version: 1,
    description: 'Read or write PLC variables on a TwinCAT 3 machine via ADS protocol. Use this to get or set values like setpoints, sensor readings, flags, or any declared PLC symbol.',
    usableAsTool: true,
    defaults: { name: 'TwinCAT ADS' },
    inputs: ['main'],
    outputs: ['main'],
    properties: [
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        options: [
          {
            name: 'Read',
            value: 'read',
            description: 'Read a variable value from the PLC by symbol name',
          },
          {
            name: 'Write',
            value: 'write',
            description: 'Write a value to a PLC variable by symbol name',
          },
        ],
        default: 'read',
      },
      {
        displayName: 'Local AmsNetID',
        name: 'localAmsNetID',
        type: 'string',
        default: '',
        placeholder: '0.0.0.0.1.1',
        description: 'AMS Net ID of this machine (found in TwinCAT System > About)',
      },
      {
        displayName: 'PLC Host',
        name: 'plcHost',
        type: 'string',
        default: '',
        placeholder: '192.168.1.100',
        description: 'IP address of the TwinCAT 3 machine (used as fallback if no local router is found)',
        required: true,
      },
      {
        displayName: 'PLC AmsNetID',
        name: 'netId',
        type: 'string',
        default: '',
        placeholder: '192.168.1.100.1.1',
        description: 'AMS Net ID of the TwinCAT 3 target (usually the PLC IP + .1.1)',
        required: true,
      },
      {
        displayName: 'Symbol Name',
        name: 'symbolName',
        type: 'string',
        default: '',
        placeholder: 'MAIN.nCounter',
        description: 'Full symbol path of the PLC variable (e.g. GVL.temperature, MAIN.setpoint)',
        required: true,
      },
      {
        displayName: 'Value',
        name: 'value',
        type: 'string',
        default: '',
        description: 'Value to write to the PLC variable. Numbers, booleans, and strings are supported.',
        displayOptions: {
          show: { operation: ['write'] },
        },
      },
      {
        displayName: 'ADS Port',
        name: 'adsPort',
        type: 'number',
        default: 851,
        description: 'ADS port of the PLC runtime (default: 851 for TwinCAT 3 runtime 1)',
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const results: INodeExecutionData[] = [];

    for (let i = 0; i < items.length; i++) {
      const operation    = this.getNodeParameter('operation', i) as string;
      const localAmsNetID = this.getNodeParameter('localAmsNetID', i, '') as string;
      const plcHost      = this.getNodeParameter('plcHost', i) as string;
      const netId        = this.getNodeParameter('netId', i) as string;
      const symbolName   = this.getNodeParameter('symbolName', i) as string;
      const adsPort      = this.getNodeParameter('adsPort', i) as number;

      let client: Client | null = null;

      try {
        client = await createAdsClient(localAmsNetID, netId, adsPort, plcHost);

        if (operation === 'read') {
          const result = await client.readValue(symbolName);
          results.push({
            json: {
              symbol: symbolName,
              value: result.value,
              type: result.dataType?.name ?? 'unknown',
            },
          });

        } else if (operation === 'write') {
          const rawValue = this.getNodeParameter('value', i) as string;
          const coerced = coerceValue(rawValue);

          await client.writeValue(symbolName, coerced);
          results.push({
            json: {
              symbol: symbolName,
              writtenValue: coerced,
              success: true,
            },
          });
        }

      } catch (error) {
        throw new NodeOperationError(
          this.getNode(),
          `ADS error on "${symbolName}": ${error.message}`,
          { itemIndex: i },
        );
      } finally {
        if (client) {
          try { await client.disconnect(); } catch (_) {}
        }
      }
    }

    return [results];
  }
}

// Coerce string input to boolean/number/string as appropriate
function coerceValue(raw: string): boolean | number | string {
  if (raw.toLowerCase() === 'true')  return true;
  if (raw.toLowerCase() === 'false') return false;
  if (!isNaN(Number(raw)) && raw.trim() !== '') return Number(raw);
  return raw;
}