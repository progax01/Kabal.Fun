import userConstraints from "../../constraints/userConstraints";
import userModel from "../../models/userModel";

class userServices {
  static getUserById = async (userId: string) => {
    try {
      const user = await userModel.findById(userId);
      
      if (!user) return null;
      
      // Create a response object with basic user data
      const userResponse = {
        _id: user._id,
        walletAddress: user.walletAddress,
        username: null,
        profileImage: null
      };
      
      // Find Twitter social and extract username and profile image
      const twitterSocial = user.socials?.find(s => s.social === 'twitter');
      if (twitterSocial) {
        userResponse.username = twitterSocial.username || null;
        userResponse.profileImage = twitterSocial.image || null;
      }
      
      return userResponse;
    } catch (err: any) {
      throw new Error(`Error while getting user by ID: ${err.message}`);
    }
  };
  static getUserByAddressAndToken = async (
    walletAddress: string,
    authToken: string
  ) => {
    try {
      const user = await userModel.findOne({
        walletAddress,
        authToken,
      });
      return user;
    } catch (err: any) {
      throw new Error(
        `Error while getting user by address and auth token: ${err.message}`
      );
    }
  };
  static updateAuthToken = async (walletAddress: string, authToken: string) => {
    try {
      const user = await this.userByWalletAddress(walletAddress);
      const authExpiryDate = new Date(
        Date.now() + userConstraints.authExpiryTimeMs
      );
      user.set({ authToken, authExpiryDate });
      await user.save();
      return user;
    } catch (err: any) {
      throw new Error(`Error while updating auth token: ${err.message}`);
    }
  };
  static userByWalletAddress = async (walletAddress: string) => {
    try {
      let user = await userModel.findOne({
        walletAddress,
      });
      if (user) {
        return user;
      }
      user = await this.createUser(walletAddress);
      return user;
    } catch (err: any) {
      throw new Error(`Error while getting user: ${err.message}`);
    }
  };
  static getUserByAddress = async(walletAddress: string)=>{
    try{
      const user = await userModel.findOne({
        walletAddress,
      })
      return user
    }catch(err:any){
      throw new Error(`Error while getting user by address: ${err.message}`)
    }
  }
  static createUser = async (walletAddress: string) => {
    try {
      const user = await userModel.create({
        walletAddress: walletAddress,
        social: [],
      });
      return user;
    } catch (err: any) {
      throw new Error(`Error while saving user: ${err.message}`);
    }
  };
}

export default userServices;
