import { Injectable } from '@nestjs/common';
import { IDataServices } from 'src/repository/data-services.abstract';
import { Action } from 'src/server/analytics/activity-stream.entity';
import { AnalyticsService } from 'src/server/analytics/service/analytics.service';
import { CreateApikeyDto, ResponseApikeyDto } from 'src/server/api-key/apikey.dto';
import { Apikey } from 'src/server/api-key/apikey.entity';
import { Source } from 'src/server/property/property.entity';
import { v4 as uuidv4 } from 'uuid';
import { ApikeyFactory } from './apikey.factory';

@Injectable()
export class ApikeyService {
  constructor(
    private readonly dataServices: IDataServices,
    private readonly apikeyFactoryService: ApikeyFactory,
    private readonly analyticsService: AnalyticsService
  ) {}

  async getApikeyByProperty(propertyIdentifier: string): Promise<ResponseApikeyDto[]> {
    const apiKeys = await this.dataServices.apikey.getByAny({ propertyIdentifier });
    const apiKeysResponse: ResponseApikeyDto[] = [];
    apiKeys.forEach(async (apiKey) => {
      const tmpApiKey = new ResponseApikeyDto();
      tmpApiKey.propertyIdentifier = apiKey.propertyIdentifier;
      tmpApiKey.label = apiKey.label;
      tmpApiKey.env = apiKey.env;
      tmpApiKey.expirationDate = apiKey.expirationDate;
      tmpApiKey.shortKey = apiKey.shortKey;
      tmpApiKey.createdBy = apiKey.createdBy;
      tmpApiKey.createdAt = apiKey.createdAt;
      apiKeysResponse.push(tmpApiKey);
    });
    return apiKeysResponse;
  }

  createApikey(createApikeyDto: CreateApikeyDto): any {
    const key = uuidv4();
    const apikey = this.apikeyFactoryService.createNewApikey(createApikeyDto, key);
    this.analyticsService.createActivityStream(
      createApikeyDto.propertyIdentifier,
      Action.APIKEY_CREATED,
      createApikeyDto.env.toString(),
      'NA',
      `${apikey.shortKey} Created for ${apikey.propertyIdentifier}`,
      apikey.createdBy,
      Source.MANAGER,
      JSON.stringify(apikey)
    );
    this.dataServices.apikey.create(apikey);
    return { key };
  }

  async deleteApiKey(propertyIdentifier: string, shortKey: string): Promise<Apikey> {
    const apiKey = (await this.dataServices.apikey.getByAny({ propertyIdentifier, shortKey }))[0];
    await this.analyticsService.createActivityStream(
      apiKey.propertyIdentifier,
      Action.APIKEY_DELETED,
      apiKey.env.toString(),
      'NA',
      `${shortKey} Deleted for ${apiKey.propertyIdentifier}`,
      apiKey.createdBy,
      Source.MANAGER,
      JSON.stringify(apiKey)
    );
    return Promise.resolve(this.dataServices.apikey.delete({ propertyIdentifier, shortKey }));
  }
}
