import axios from 'axios';
import FormData from 'form-data';
import envConfigs from '../../configs/envConfigs';
import fs from 'fs';

class CloudflareImageService {
  private accountId: string;
  private apiToken: string;
  private baseUrl: string;

  constructor() {
    this.accountId = envConfigs.cloudflareAccountId;
    this.apiToken = envConfigs.cloudflareApiToken;
    this.baseUrl = `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/images/v1`;
  }

  async deleteImage(imageId: string): Promise<boolean> {
    try {
      const response = await axios.delete(
        `${this.baseUrl}/${imageId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiToken}`
          }
        }
      );

      return response.data.success;
    } catch (error) {
      console.error('Error deleting image from Cloudflare:', error);
      return false;
    }
  }

  async uploadImageFromPath(filePath: string): Promise<string> {
    try {
      const formData = new FormData();
      formData.append('file', fs.createReadStream(filePath));
      
      const response = await axios.post(
        `${this.baseUrl}`,
        formData,
        {
          headers: {
            ...formData.getHeaders(),
            'Authorization': `Bearer ${this.apiToken}`
          }
        }
      );
      
      if (!response.data.success) {
        throw new Error(`Cloudflare upload failed: ${JSON.stringify(response.data.errors)}`);
      }
      
      // Return the delivery URL for the image
      if (response.data.result && response.data.result.variants && response.data.result.variants.length > 0) {
        return response.data.result.variants[0];
      } else if (response.data.result && response.data.result.id) {
        // If variants aren't available, construct URL from ID
        return `https://imagedelivery.net/${this.accountId}/${response.data.result.id}/public`;
      } else {
        throw new Error('No image URL or ID found in Cloudflare response');
      }
    } catch (error) {
      console.error('Error uploading from path:', error.data);
      return 'https://via.placeholder.com/150';
    }
  }

}

export default new CloudflareImageService(); 