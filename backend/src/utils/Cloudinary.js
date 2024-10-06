import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET_KEY,
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null;
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto",
        });
        fs.unlinkSync(localFilePath);
        return response;
    } catch (error) {
        fs.unlinkSync(localFilePath);
        return null;
    }
};

// ********* Delete the resource from Cloudinary
const deleteFromCloudinary = async (url, resource_type) => {
    const publicId = extractPublicId(url);
    try {
        if (!url) return null;
        await cloudinary.uploader.destroy(publicId, {
            resource_type: resource_type,
        });
        console.log(`Deleted resource from Cloudinary: ${publicId}`);
    } catch (error) {
        console.error("Error deleting resources from Cloudinary", error);
    }
};

//*** Function to extract public ID from Cloudinary URL
const extractPublicId = (url) => {
    const parts = url.split("/");
    const publicIdWithExtension = parts[parts.length - 1]; // Last part of the URL
    const publicId = publicIdWithExtension.split(".")[0]; // Remove file extension
    return publicId;
};

export { uploadOnCloudinary, deleteFromCloudinary };
