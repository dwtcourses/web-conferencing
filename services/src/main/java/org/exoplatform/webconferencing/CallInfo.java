/*
 * Copyright (C) 2003-2017 eXo Platform SAS.
 *
 * This is free software; you can redistribute it and/or modify it
 * under the terms of the GNU Lesser General Public License as
 * published by the Free Software Foundation; either version 2.1 of
 * the License, or (at your option) any later version.
 *
 * This software is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public
 * License along with this software; if not, write to the Free
 * Software Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA
 * 02110-1301 USA, or see the FSF site: http://www.fsf.org.
 */
package org.exoplatform.webconferencing;

import java.util.Collection;
import java.util.Collections;
import java.util.Date;
import java.util.LinkedHashSet;
import java.util.Set;

import javax.persistence.Transient;

import org.exoplatform.webconferencing.domain.CallEntity;

/**
 * Created by The eXo Platform SAS.
 *
 * @author <a href="mailto:pnedonosko@exoplatform.com">Peter Nedonosko</a>
 * @version $Id: CallInfo.java 00000 Jun 19, 2017 pnedonosko $
 */
public class CallInfo {

  /** The id. */
  protected final String        id;

  /** The title. */
  protected final String        title;

  /** The participant IDs. For internal use. */
  @Deprecated
  private final Set<String>   participantIds = new LinkedHashSet<>();

  /** The participants. */
  protected final Set<UserInfo> participants   = new LinkedHashSet<>();

  /** The owner. */
  protected final IdentityInfo  owner;

  /** The provider type. */
  protected final String        providerType;

  /** The state. */
  protected String              state;

  /** The last date. */
  protected Date                lastDate;
  
  /** The entity. */
  protected transient CallEntity                entity; // transient to avoid serialization to JSON

  /**
   * Instantiates a new call info.
   *
   * @param id the id
   * @param title the title
   * @param owner the owner
   * @param providerType the provider type
   */
  public CallInfo(String id, String title, IdentityInfo owner, String providerType) {
    super();
    this.id = id;
    this.title = title;
    this.owner = owner;
    this.providerType = providerType;
  }

  /**
   * Gets the id.
   *
   * @return the id
   */
  public String getId() {
    return id;
  }

  /**
   * Gets the title.
   *
   * @return the title
   */
  public String getTitle() {
    return title;
  }

  /**
   * Gets the participants (users planned for the call).
   *
   * @return the participants
   */
  public Set<UserInfo> getParticipants() {
    return Collections.unmodifiableSet(participants);
  }

  /**
   * Checks if it is a participant (by user ID).
   *
   * @param partId the part id
   * @return true, if is participant
   */
  @Deprecated
  private boolean isParticipant(String partId) {
    return participantIds.contains(partId);
  }

  /**
   * Gets the owner.
   *
   * @return the owner
   */
  public IdentityInfo getOwner() {
    return owner;
  }

  /**
   * Gets the provider type.
   *
   * @return the provider type
   */
  public String getProviderType() {
    return providerType;
  }

  /**
   * Adds the participants.
   *
   * @param parts the parts
   */
  public void addParticipants(Collection<UserInfo> parts) {
    for (UserInfo part : parts) {
      addParticipant(part);
    }
  }

  /**
   * Adds the participant.
   *
   * @param part the part
   */
  public void addParticipant(UserInfo part) {
    if (!this.participants.add(part)) {
      // a new part added
      if (entity != null) {
        // keep the entity synced here? but we already do in service's saveCall()
      }
    } // else, it was already existing part
    //this.participantIds.add(part.getId());
  }

  /**
   * Gets the state.
   *
   * @return the state
   */
  public String getState() {
    return state;
  }

  /**
   * Sets the state.
   *
   * @param state the new state
   */
  public void setState(String state) {
    this.state = state;
  }

  /**
   * Gets the last date.
   *
   * @return the lastDate
   */
  public Date getLastDate() {
    return lastDate;
  }

  /**
   * Sets the last date.
   *
   * @param lastDate the lastDate to set
   */
  public void setLastDate(Date lastDate) {
    this.lastDate = lastDate;
  }

  /**
   * @return the entity
   */
  @Transient // to avoid serialization to JSON
  protected CallEntity getEntity() {
    return entity;
  }

  /**
   * Sets the entity.
   *
   * @param entity the entity to set
   */
  @Transient // to avoid serialization to JSON
  protected void setEntity(CallEntity entity) {
    this.entity = entity;
  }
  
  /**
   * Checks for entity.
   *
   * @return true, if successful
   */
  @Transient // to avoid serialization to JSON
  protected boolean hasEntity() {
    return entity != null;
  }

  /**
   * Gets the participant ids.
   *
   * @return the participantIds
   */
  @Deprecated
  private Set<String> getParticipantIds() {
    return participantIds;
  }

}
