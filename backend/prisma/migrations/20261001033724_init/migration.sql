BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[Users] (
    [id] INT NOT NULL IDENTITY(1,1),
    [firstName] NVARCHAR(80) NOT NULL,
    [lastName] NVARCHAR(80) NOT NULL,
    [email] NVARCHAR(160) NOT NULL,
    [phone] NVARCHAR(30) NOT NULL,
    [passwordHash] NVARCHAR(100) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Users_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [Users_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Users_email_key] UNIQUE NONCLUSTERED ([email])
);

-- CreateTable
CREATE TABLE [dbo].[ItemTypes] (
    [id] INT NOT NULL IDENTITY(1,1),
    [name] NVARCHAR(60) NOT NULL,
    CONSTRAINT [ItemTypes_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [ItemTypes_name_key] UNIQUE NONCLUSTERED ([name])
);

-- CreateTable
CREATE TABLE [dbo].[Makes] (
    [id] INT NOT NULL IDENTITY(1,1),
    [name] NVARCHAR(60) NOT NULL,
    CONSTRAINT [Makes_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Makes_name_key] UNIQUE NONCLUSTERED ([name])
);

-- CreateTable
CREATE TABLE [dbo].[VehicleModels] (
    [id] INT NOT NULL IDENTITY(1,1),
    [makeId] INT NOT NULL,
    [name] NVARCHAR(80) NOT NULL,
    CONSTRAINT [VehicleModels_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [VehicleModels_makeId_name_key] UNIQUE NONCLUSTERED ([makeId],[name])
);

-- CreateTable
CREATE TABLE [dbo].[Transmissions] (
    [id] INT NOT NULL IDENTITY(1,1),
    [name] NVARCHAR(60) NOT NULL,
    CONSTRAINT [Transmissions_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Transmissions_name_key] UNIQUE NONCLUSTERED ([name])
);

-- CreateTable
CREATE TABLE [dbo].[FuelTypes] (
    [id] INT NOT NULL IDENTITY(1,1),
    [name] NVARCHAR(60) NOT NULL,
    CONSTRAINT [FuelTypes_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [FuelTypes_name_key] UNIQUE NONCLUSTERED ([name])
);

-- CreateTable
CREATE TABLE [dbo].[DriveTrains] (
    [id] INT NOT NULL IDENTITY(1,1),
    [code] NVARCHAR(10) NOT NULL,
    [description] NVARCHAR(80) NOT NULL,
    CONSTRAINT [DriveTrains_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [DriveTrains_code_key] UNIQUE NONCLUSTERED ([code])
);

-- CreateTable
CREATE TABLE [dbo].[DamageLevels] (
    [id] INT NOT NULL IDENTITY(1,1),
    [code] NVARCHAR(10) NOT NULL,
    [name] NVARCHAR(40) NOT NULL,
    [description] NVARCHAR(120) NOT NULL,
    [color] NVARCHAR(10) NOT NULL,
    CONSTRAINT [DamageLevels_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [DamageLevels_code_key] UNIQUE NONCLUSTERED ([code])
);

-- CreateTable
CREATE TABLE [dbo].[Vehicles] (
    [id] INT NOT NULL IDENTITY(1,1),
    [ownerId] INT NOT NULL,
    [year] INT NOT NULL,
    [itemTypeId] INT NOT NULL,
    [makeId] INT NOT NULL,
    [modelId] INT NOT NULL,
    [engine] NVARCHAR(80) NOT NULL,
    [transmissionId] INT NOT NULL,
    [fuelTypeId] INT NOT NULL,
    [driveTrainId] INT NOT NULL,
    [cylinders] INT NOT NULL,
    [damageLevelId] INT NOT NULL,
    [vin] NVARCHAR(30),
    [mileage] INT,
    [color] NVARCHAR(40),
    [description] NVARCHAR(2000),
    [basePrice] DECIMAL(12,2) NOT NULL,
    [startAt] DATETIME2 NOT NULL,
    [endAt] DATETIME2 NOT NULL,
    [currentBid] DECIMAL(12,2),
    [currentBidderId] INT,
    [bidCount] INT NOT NULL CONSTRAINT [Vehicles_bidCount_df] DEFAULT 0,
    [status] NVARCHAR(12) NOT NULL CONSTRAINT [Vehicles_status_df] DEFAULT 'SCHEDULED',
    [closedAt] DATETIME2,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Vehicles_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Vehicles_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[VehiclePhotos] (
    [id] INT NOT NULL IDENTITY(1,1),
    [vehicleId] INT NOT NULL,
    [sortOrder] INT NOT NULL CONSTRAINT [VehiclePhotos_sortOrder_df] DEFAULT 0,
    [url] NVARCHAR(500),
    [mimeType] NVARCHAR(40),
    [data] VARBINARY(max),
    CONSTRAINT [VehiclePhotos_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Bids] (
    [id] INT NOT NULL IDENTITY(1,1),
    [vehicleId] INT NOT NULL,
    [userId] INT NOT NULL,
    [amount] DECIMAL(12,2) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Bids_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [Bids_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Vehicles_status_endAt_idx] ON [dbo].[Vehicles]([status], [endAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Vehicles_makeId_modelId_idx] ON [dbo].[Vehicles]([makeId], [modelId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Vehicles_ownerId_idx] ON [dbo].[Vehicles]([ownerId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [VehiclePhotos_vehicleId_sortOrder_idx] ON [dbo].[VehiclePhotos]([vehicleId], [sortOrder]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Bids_vehicleId_amount_idx] ON [dbo].[Bids]([vehicleId], [amount]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Bids_userId_idx] ON [dbo].[Bids]([userId]);

-- AddForeignKey
ALTER TABLE [dbo].[VehicleModels] ADD CONSTRAINT [VehicleModels_makeId_fkey] FOREIGN KEY ([makeId]) REFERENCES [dbo].[Makes]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Vehicles] ADD CONSTRAINT [Vehicles_ownerId_fkey] FOREIGN KEY ([ownerId]) REFERENCES [dbo].[Users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Vehicles] ADD CONSTRAINT [Vehicles_currentBidderId_fkey] FOREIGN KEY ([currentBidderId]) REFERENCES [dbo].[Users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Vehicles] ADD CONSTRAINT [Vehicles_itemTypeId_fkey] FOREIGN KEY ([itemTypeId]) REFERENCES [dbo].[ItemTypes]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Vehicles] ADD CONSTRAINT [Vehicles_makeId_fkey] FOREIGN KEY ([makeId]) REFERENCES [dbo].[Makes]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Vehicles] ADD CONSTRAINT [Vehicles_modelId_fkey] FOREIGN KEY ([modelId]) REFERENCES [dbo].[VehicleModels]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Vehicles] ADD CONSTRAINT [Vehicles_transmissionId_fkey] FOREIGN KEY ([transmissionId]) REFERENCES [dbo].[Transmissions]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Vehicles] ADD CONSTRAINT [Vehicles_fuelTypeId_fkey] FOREIGN KEY ([fuelTypeId]) REFERENCES [dbo].[FuelTypes]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Vehicles] ADD CONSTRAINT [Vehicles_driveTrainId_fkey] FOREIGN KEY ([driveTrainId]) REFERENCES [dbo].[DriveTrains]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Vehicles] ADD CONSTRAINT [Vehicles_damageLevelId_fkey] FOREIGN KEY ([damageLevelId]) REFERENCES [dbo].[DamageLevels]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[VehiclePhotos] ADD CONSTRAINT [VehiclePhotos_vehicleId_fkey] FOREIGN KEY ([vehicleId]) REFERENCES [dbo].[Vehicles]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Bids] ADD CONSTRAINT [Bids_vehicleId_fkey] FOREIGN KEY ([vehicleId]) REFERENCES [dbo].[Vehicles]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Bids] ADD CONSTRAINT [Bids_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[Users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
